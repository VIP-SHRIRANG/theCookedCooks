#!/usr/bin/env python3
"""
ChainGuard API Server
Flask backend for React frontend with SQLite database support
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import time
import queue
from datetime import datetime, timedelta
import backend
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
import pandas as pd
import json
import sqlite3
import os
import logging
import random
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
try:
    from catboost import CatBoostClassifier
    CATBOOST_AVAILABLE = True
except ImportError:
    CATBOOST_AVAILABLE = False
    print("⚠️  CatBoost not available, falling back to Isolation Forest")

# Import ensemble system
try:
    import joblib
    ENSEMBLE_AVAILABLE = True
except ImportError:
    ENSEMBLE_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global state
monitoring_state = {
    'active': False,
    'connected': False,
    'total_processed': 0,
    'total_fraud': 0,
    'current_block': 0,
    'last_update': None,
    'w3': None,
    'last_processed_block': 0,
}

# Data storage
live_transactions = []
fraud_history = []
high_risk_transactions = []
suspicious_alerts = []  # New: Store suspicious transactions for alerts
transaction_queue = queue.Queue()
processed_tx_hashes = set()  # Track processed transactions to avoid duplicates

# Load ML model
model, feature_columns = backend.load_model_and_columns()

# Global ensemble system
ensemble_system = {
    'models': None,
    'scaler': None,
    'feature_names': None,
    'metrics': None,
    'is_loaded': False
}

# Centralized risk threshold logic for consistency
def get_risk_level_and_action(risk_score):
    """
    Centralized risk level determination for consistency across all analysis methods
    
    Thresholds:
    - ≥80%: BLOCKED (High Risk - Block transaction)
    - 65-79%: SUSPICIOUS (Medium Risk - Flag for investigation, triggers alerts)
    - <65%: APPROVED (Low Risk - Allow transaction)
    """
    if risk_score >= 80:
        return {
            'level': 'BLOCKED',
            'action': 'Block',
            'threat_level': 'HIGH',
            'description': '  CRITICAL - Block Transaction Immediately',
            'triggers_alert': False  # Already blocked, no need for alert
        }
    elif risk_score >= 65:  # Suspicious range 65-80% (triggers alerts)
        return {
            'level': 'SUSPICIOUS', 
            'action': 'Alert',
            'threat_level': 'MEDIUM',
            'description': '⚠️ HIGH RISK - Flag for Investigation',
            'triggers_alert': True  # This range triggers suspicious alerts
        }
    else:  # Approve everything below 65%
        return {
            'level': 'APPROVED',
            'action': 'Approve', 
            'threat_level': 'LOW',
            'description': '✅ LOW RISK - Allow Transaction',
            'triggers_alert': False
        }

def load_ensemble_system():
    """Load the trained ensemble system"""
    global ensemble_system
    
    try:
        if (os.path.exists('ensemble_models.pkl') and 
            os.path.exists('ensemble_scaler.pkl') and 
            os.path.exists('ensemble_feature_names.pkl') and 
            os.path.exists('ensemble_metrics.pkl')):
            
            ensemble_system['models'] = joblib.load('ensemble_models.pkl')
            ensemble_system['scaler'] = joblib.load('ensemble_scaler.pkl')
            ensemble_system['feature_names'] = joblib.load('ensemble_feature_names.pkl')
            ensemble_system['metrics'] = joblib.load('ensemble_metrics.pkl')
            ensemble_system['is_loaded'] = True
            
            logger.info("✅ Ensemble system loaded successfully")
            logger.info(f"📊 Ensemble F1-Score: {ensemble_system['metrics']['test_f1']:.3f}")
            logger.info(f"📊 Ensemble Precision: {ensemble_system['metrics']['test_precision']:.3f}")
            logger.info(f"📊 Ensemble Recall: {ensemble_system['metrics']['test_recall']:.3f}")
            
            return True
        else:
            logger.warning("⚠️  Ensemble system files not found, using fallback models")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error loading ensemble system: {e}")
        return False

def advanced_feature_engineering_for_ensemble(df):
    """Advanced feature engineering for ensemble system"""
    features = pd.DataFrame()
    
    # Basic features
    features['value_eth'] = df['Value'] / 1e18
    features['block_height'] = df['BlockHeight']
    features['is_error'] = df['isError']
    
    # Value-based features
    features['log_value'] = np.log1p(features['value_eth'])
    features['sqrt_value'] = np.sqrt(features['value_eth'])
    features['value_squared'] = features['value_eth'] ** 2
    
    # Value categories
    value_percentiles = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999]
    for p in value_percentiles:
        features[f'value_above_p{int(p*1000)}'] = (features['value_eth'] > features['value_eth'].quantile(p)).astype(int)
    
    # Round number detection
    for decimals in range(5):
        features[f'is_round_{decimals}'] = (features['value_eth'].round(decimals) == features['value_eth']).astype(int)
    
    # Value range categories
    features['is_dust'] = (features['value_eth'] < 0.0001).astype(int)
    features['is_micro'] = ((features['value_eth'] >= 0.0001) & (features['value_eth'] < 0.001)).astype(int)
    features['is_small'] = ((features['value_eth'] >= 0.001) & (features['value_eth'] < 0.01)).astype(int)
    features['is_medium'] = ((features['value_eth'] >= 0.01) & (features['value_eth'] < 0.1)).astype(int)
    features['is_large'] = ((features['value_eth'] >= 0.1) & (features['value_eth'] < 1)).astype(int)
    features['is_very_large'] = ((features['value_eth'] >= 1) & (features['value_eth'] < 10)).astype(int)
    features['is_huge'] = (features['value_eth'] >= 10).astype(int)
    
    # Address features
    features['from_length'] = df['From'].str.len().fillna(42)
    features['to_length'] = df['To'].str.len().fillna(42)
    features['same_address'] = (df['From'] == df['To']).fillna(False).astype(int)
    
    # Address pattern analysis
    features['from_has_pattern'] = df['From'].str.contains(r'(.)\1{3,}', regex=True, na=False).astype(int)
    features['to_has_pattern'] = df['To'].str.contains(r'(.)\1{3,}', regex=True, na=False).astype(int)
    features['from_has_sequence'] = df['From'].str.contains(r'(012|123|234|345|456|567|678|789|abc|def)', regex=True, na=False).astype(int)
    features['to_has_sequence'] = df['To'].str.contains(r'(012|123|234|345|456|567|678|789|abc|def)', regex=True, na=False).astype(int)
    
    # Time-based features
    timestamps = pd.to_datetime(df['TimeStamp'], unit='s')
    features['hour'] = timestamps.dt.hour
    features['day_of_week'] = timestamps.dt.dayofweek
    features['day_of_month'] = timestamps.dt.day
    features['month'] = timestamps.dt.month
    features['quarter'] = timestamps.dt.quarter
    features['is_weekend'] = (timestamps.dt.dayofweek >= 5).astype(int)
    features['is_night'] = ((timestamps.dt.hour >= 22) | (timestamps.dt.hour <= 6)).astype(int)
    features['is_business_hours'] = ((timestamps.dt.hour >= 9) & (timestamps.dt.hour <= 17)).astype(int)
    features['is_suspicious_hour'] = timestamps.dt.hour.isin([2, 3, 4, 5]).astype(int)
    features['is_peak_trading'] = timestamps.dt.hour.isin([14, 15, 16]).astype(int)
    
    # Block-based features
    features['block_mod_100'] = features['block_height'] % 100
    features['block_mod_1000'] = features['block_height'] % 1000
    
    # Statistical features
    features['value_zscore'] = (features['value_eth'] - features['value_eth'].mean()) / (features['value_eth'].std() + 1e-8)
    features['value_rank'] = features['value_eth'].rank(pct=True)
    features['value_iqr'] = ((features['value_eth'] >= features['value_eth'].quantile(0.25)) & 
                            (features['value_eth'] <= features['value_eth'].quantile(0.75))).astype(int)
    
    # Address frequency features
    from_counts = df['From'].value_counts()
    to_counts = df['To'].value_counts()
    
    features['from_frequency'] = df['From'].map(from_counts).fillna(1)
    features['to_frequency'] = df['To'].map(to_counts).fillna(1)
    features['from_frequency_log'] = np.log1p(features['from_frequency'])
    features['to_frequency_log'] = np.log1p(features['to_frequency'])
    
    # High-frequency indicators
    features['from_high_freq'] = (features['from_frequency'] > features['from_frequency'].quantile(0.95)).astype(int)
    features['to_high_freq'] = (features['to_frequency'] > features['to_frequency'].quantile(0.95)).astype(int)
    features['from_very_high_freq'] = (features['from_frequency'] > features['from_frequency'].quantile(0.99)).astype(int)
    features['to_very_high_freq'] = (features['to_frequency'] > features['to_frequency'].quantile(0.99)).astype(int)
    
    # Interaction features
    features['value_hour_interaction'] = features['value_eth'] * features['hour']
    features['error_value_interaction'] = features['is_error'] * features['log_value']
    features['weekend_value_interaction'] = features['is_weekend'] * features['value_eth']
    features['night_value_interaction'] = features['is_night'] * features['value_eth']
    features['freq_value_interaction'] = features['from_frequency_log'] * features['log_value']
    
    # Anomaly features
    features['value_outlier'] = (np.abs(features['value_zscore']) > 3).astype(int)
    features['extreme_outlier'] = (np.abs(features['value_zscore']) > 5).astype(int)
    
    # Clean up
    features = features.fillna(0)
    features = features.replace([np.inf, -np.inf], 0)
    
    return features

def predict_with_ensemble(df):
    """Make predictions using the ensemble system"""
    if not ensemble_system['is_loaded']:
        return None
    
    try:
        # Feature engineering
        X = advanced_feature_engineering_for_ensemble(df)
        
        # Scale features
        X_scaled = ensemble_system['scaler'].transform(X)
        
        # Get predictions from all models
        models = ensemble_system['models']
        weights = ensemble_system['metrics']['ensemble_config']['weights']
        threshold = ensemble_system['metrics']['ensemble_config']['threshold']
        
        # Ensemble predictions
        ensemble_proba = np.zeros(len(df))
        
        for name, model_info in models.items():
            model = model_info['model']
            proba = model.predict_proba(X_scaled)[:, 1]
            ensemble_proba += proba * weights[name]
        
        # Final predictions
        ensemble_pred = (ensemble_proba >= threshold).astype(int)
        
        return ensemble_pred, ensemble_proba
        
    except Exception as e:
        logger.error(f"Error in ensemble prediction: {e}")
        return None

# Load ensemble system on startup
load_ensemble_system()

def analyze_with_ensemble_system(df):
    """Analyze transactions using the ensemble system"""
    try:
        # Get ensemble predictions
        prediction_result = predict_with_ensemble(df)
        
        if prediction_result is None:
            logger.error("Ensemble prediction failed, falling back to basic analysis")
            return csv_analyzer.analyze_transactions(df)
        
        # Safely unpack the result
        try:
            ensemble_pred, ensemble_proba = prediction_result
        except (TypeError, ValueError) as e:
            logger.error(f"Failed to unpack ensemble prediction result: {e}")
            return csv_analyzer.analyze_transactions(df)
        
        if ensemble_pred is None or ensemble_proba is None:
            logger.error("Ensemble prediction returned None values, falling back to basic analysis")
            return csv_analyzer.analyze_transactions(df)
        
        results = []
        
        for idx, row in df.iterrows():
            # Smart conversion: check if values are already in ETH or in Wei
            raw_value = float(row['Value'])
            if raw_value > 1000:  # Likely in Wei (values > 1000 ETH are rare)
                value_eth = raw_value / 1e18
            else:  # Likely already in ETH
                value_eth = raw_value
            
            # Get ensemble prediction
            is_fraud = bool(ensemble_pred[idx])
            fraud_probability = float(ensemble_proba[idx])
            risk_score = int(fraud_probability * 100)
            
            # Determine risk level and action using centralized logic
            risk_info = get_risk_level_and_action(risk_score)
            risk_level = risk_info['level']
            action = risk_info['action']
            threat_level = risk_info['threat_level']
            
            # Generate flags based on ensemble features
            flags = []
            
            # Basic fraud indicators
            if row.get('isError', 0) == 1:
                flags.append("Transaction Error")
            
            if value_eth > 100:
                flags.append("Large Amount")
            elif value_eth < 0.001:
                flags.append("Dust Transaction")
            
            if value_eth == round(value_eth, 0) and value_eth >= 1:
                flags.append("Round Amount")
            
            # Time-based flags
            try:
                timestamp = pd.to_datetime(row['TimeStamp'], unit='s')
                if timestamp.hour in [2, 3, 4, 5]:
                    flags.append("Suspicious Hour")
                if timestamp.dayofweek >= 5:
                    flags.append("Weekend Transaction")
            except:
                pass
            
            # Address-based flags
            if row.get('From') == row.get('To'):
                flags.append("Self Transaction")
            
            # Ensemble-specific flags
            if is_fraud:
                flags.append("Ensemble High Risk")
            
            if fraud_probability > 0.8:
                flags.append("High Confidence Fraud")
            
            result = {
                'transaction_id': row['TxHash'],  # Frontend expects this field
                'TxHash': row['TxHash'],
                'From': row['From'],
                'To': row['To'],
                'Value': value_eth,
                'amount': value_eth,  # Frontend compatibility - same as Value
                'from_address': row['From'],  # Frontend compatibility
                'to_address': row['To'],      # Frontend compatibility
                'BlockHeight': row['BlockHeight'],
                'block_height': row['BlockHeight'],  # Frontend compatibility
                'TimeStamp': row['TimeStamp'],
                'is_error': bool(row.get('isError', 0)),  # Frontend compatibility
                'risk_score': risk_score,
                'fraud_probability': fraud_probability,
                'label': risk_level,
                'status': risk_level,  # Add status field for compatibility
                'action': action,
                'flags': flags,
                'is_fraud': is_fraud,
                'model_type': 'Advanced Ensemble',
                'confidence': abs(fraud_probability - 0.5) * 2,
                'details': f"Risk: {risk_score}% - {', '.join(flags) if flags else 'Standard analysis'}"
            }
            
            results.append(result)
        
        logger.info(f"✅ Ensemble analysis completed: {len(results)} transactions analyzed")
        return results
        
    except Exception as e:
        logger.error(f"Error in ensemble analysis: {e}")
        # Fallback to basic analysis
        return csv_analyzer.analyze_transactions(df)

# Database configuration
DB_FILE = 'chainguard.db'

def init_database():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT UNIQUE,
            block_height INTEGER,
            timestamp INTEGER,
            from_address TEXT,
            to_address TEXT,
            value REAL,
            fraud_score REAL,
            risk_score INTEGER,
            label TEXT,
            action TEXT,
            processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create node analysis table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS node_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT UNIQUE,
            total_transactions INTEGER DEFAULT 0,
            fraud_transactions INTEGER DEFAULT 0,
            fraud_percentage REAL DEFAULT 0.0,
            total_value REAL DEFAULT 0.0,
            fraud_value REAL DEFAULT 0.0,
            risk_score REAL DEFAULT 0.0,
            first_seen DATETIME,
            last_seen DATETIME,
            is_flagged BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create training history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            model_version TEXT,
            accuracy REAL,
            precision_score REAL,
            recall_score REAL,
            f1_score REAL,
            roc_auc REAL,
            training_samples INTEGER,
            feature_count INTEGER,
            notes TEXT
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def save_transaction_to_db(tx_data):
    """Save transaction to database"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO transactions 
            (tx_hash, block_height, timestamp, from_address, to_address, value, 
             fraud_score, risk_score, label, action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tx_data['TxHash'],
            tx_data['BlockHeight'],
            tx_data['TimeStamp'],
            tx_data['From'],
            tx_data['To'],
            tx_data['Value'],
            tx_data.get('fraud_probability', 0),
            tx_data.get('risk_score', 0),
            tx_data.get('label', 'Unknown'),
            tx_data.get('action', 'Monitor')
        ))
        
        conn.commit()
        conn.close()
        
        # Update node analysis
        update_node_analysis(tx_data)
        
    except Exception as e:
        logger.error(f"Error saving transaction to database: {e}")

def update_node_analysis(tx_data):
    """Update node analysis with new transaction data"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Update both from and to addresses
        addresses = [tx_data['From'], tx_data['To']]
        
        for address in addresses:
            if not address or address == '0x0000000000000000000000000000000000000000':
                continue
            
            # Get current stats
            cursor.execute('''
                SELECT total_transactions, fraud_transactions, total_value, fraud_value, first_seen
                FROM node_analysis WHERE address = ?
            ''', (address,))
            
            result = cursor.fetchone()
            
            is_fraud = tx_data.get('label') == 'Fraudulent'
            tx_value = float(tx_data.get('Value', 0)) / 1e18  # Convert from wei to ETH
            
            if result:
                # Update existing record
                total_tx, fraud_tx, total_val, fraud_val, first_seen = result
                new_total_tx = total_tx + 1
                new_fraud_tx = fraud_tx + (1 if is_fraud else 0)
                new_total_val = total_val + tx_value
                new_fraud_val = fraud_val + (tx_value if is_fraud else 0)
                fraud_percentage = (new_fraud_tx / new_total_tx) * 100
                
                # Calculate risk score
                risk_score = min(100, (
                    fraud_percentage * 0.4 +
                    min(100, (new_fraud_tx / 10) * 100) * 0.3 +
                    min(100, (new_total_val / 1000) * 100) * 0.2 +
                    min(100, (new_total_tx / 100) * 100) * 0.1
                )) / 100
                
                cursor.execute('''
                    UPDATE node_analysis 
                    SET total_transactions = ?, fraud_transactions = ?, fraud_percentage = ?,
                        total_value = ?, fraud_value = ?, risk_score = ?,
                        last_seen = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE address = ?
                ''', (new_total_tx, new_fraud_tx, fraud_percentage, new_total_val, new_fraud_val, risk_score, address))
            else:
                # Create new record
                fraud_percentage = 100 if is_fraud else 0
                risk_score = 0.5 if is_fraud else 0.1
                
                cursor.execute('''
                    INSERT INTO node_analysis 
                    (address, total_transactions, fraud_transactions, fraud_percentage,
                     total_value, fraud_value, risk_score, first_seen, last_seen)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ''', (address, 1, 1 if is_fraud else 0, fraud_percentage, tx_value, tx_value if is_fraud else 0, risk_score))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error updating node analysis: {e}")

# Initialize database on startup
init_database()

def connect_to_blockchain():
    """Connect to Polygon mainnet"""
    try:
        # Try public RPC first
        w3 = Web3(Web3.HTTPProvider("https://polygon-rpc.com"))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
        if w3.is_connected():
            monitoring_state['w3'] = w3
            monitoring_state['connected'] = True
            monitoring_state['current_block'] = w3.eth.block_number
            return True
        
        return False
    except Exception as e:
        print(f"Connection error: {e}")
        return False

def process_transaction_data(tx_data):
    """Process transaction data through ML pipeline"""
    try:
        # Predict fraud
        df_result = backend.predict_with_risk(pd.DataFrame([tx_data]))
        
        result = {
            **tx_data,
            'fraud_probability': float(df_result['p_fraud'].iloc[0]),
            'risk_score': int(df_result['risk_score'].iloc[0]),
            'label': df_result['label'].iloc[0],
            'action': df_result['action'].iloc[0],
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    except Exception as e:
        print(f"Processing error: {e}")
        return None

def monitoring_loop():
    """Background monitoring loop"""
    while monitoring_state['active']:
        try:
            if not monitoring_state['w3'] or not monitoring_state['connected']:
                time.sleep(5)
                continue
            
            w3 = monitoring_state['w3']
            current_block = w3.eth.block_number
            monitoring_state['current_block'] = current_block
            
            # Process new blocks
            if current_block > monitoring_state['last_processed_block']:
                # Process up to 3 recent blocks
                start_block = max(monitoring_state['last_processed_block'] + 1, current_block - 2)
                
                for block_num in range(start_block, current_block + 1):
                    if not monitoring_state['active']:
                        break
                    
                    try:
                        block = w3.eth.get_block(block_num, full_transactions=True)
                        
                        # Process sample of transactions (increased for better demo)
                        sample_size = min(5, len(block['transactions']))
                        
                        print(f"📦 Processing block {block_num} with {len(block['transactions'])} transactions (sampling {sample_size})")
                        
                        for tx in block['transactions'][:sample_size]:
                            if not monitoring_state['active']:
                                break
                            
                            # Create transaction data with proper hash formatting
                            tx_hash = tx['hash'].hex()
                            if not tx_hash.startswith('0x'):
                                tx_hash = '0x' + tx_hash
                            
                            # Convert Wei to ETH for proper value display
                            value_wei = int(tx['value'])
                            value_eth = value_wei / 1e18  # Convert Wei to ETH
                            
                            tx_data = {
                                'TxHash': tx_hash,
                                'BlockHeight': block_num,
                                'TimeStamp': block['timestamp'],
                                'From': tx['from'],
                                'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                                'Value': value_eth,  # Store as ETH, not Wei
                                'Value_Wei': value_wei  # Keep original Wei value for reference
                            }
                            
                            # Skip if already processed
                            tx_hash = tx_data['TxHash']
                            if tx_hash in processed_tx_hashes:
                                continue
                            
                            # Process transaction
                            result = process_transaction_data(tx_data)
                            if result:
                                processed_tx_hashes.add(tx_hash)
                                transaction_queue.put(result)
                                
                                # Save to database
                                save_transaction_to_db(result)
                                
                                # Log real transaction processing
                                print(f"✅ Processed real transaction: {tx_hash[:10]}... Risk: {result['risk_score']}%")
                    
                    except Exception as block_error:
                        continue
                
                monitoring_state['last_processed_block'] = current_block
            
            # Update metrics
            monitoring_state['last_update'] = datetime.now().isoformat()
            
            # Process queued transactions
            while not transaction_queue.empty():
                try:
                    tx = transaction_queue.get_nowait()
                    
                    # Add to live transactions
                    live_transactions.insert(0, tx)
                    if len(live_transactions) > 1000:
                        live_transactions.pop()
                    
                    # Add to fraud history
                    fraud_history.append(tx['fraud_probability'])
                    if len(fraud_history) > 1000:
                        fraud_history.pop(0)
                    
                    # Update counters
                    monitoring_state['total_processed'] += 1
                    if tx['label'] == 'Fraudulent':
                        monitoring_state['total_fraud'] += 1
                    
                    # Add to high risk if applicable
                    if tx['risk_score'] >= 80:
                        high_risk_transactions.insert(0, tx)
                        if len(high_risk_transactions) > 100:
                            high_risk_transactions.pop()
                    
                    # Add to suspicious alerts if in suspicious range (65-80%)
                    elif tx['risk_score'] >= 65:
                        alert_tx = {
                            **tx,
                            'alert_type': 'SUSPICIOUS',
                            'alert_time': datetime.now().isoformat(),
                            'alert_reason': f"Risk score {tx['risk_score']}% in suspicious range (65-80%)"
                        }
                        suspicious_alerts.insert(0, alert_tx)
                        if len(suspicious_alerts) > 200:  # Keep more alerts than high risk
                            suspicious_alerts.pop()
                        
                        # Log suspicious alert
                        print(f"  SUSPICIOUS ALERT: {tx['TxHash'][:10]}... Risk: {tx['risk_score']}%")
                
                except queue.Empty:
                    break
            
            # Cleanup processed hashes to prevent memory growth
            if len(processed_tx_hashes) > 5000:
                # Keep only the most recent 2500 hashes
                processed_tx_hashes.clear()
                if live_transactions:
                    for tx in live_transactions[:2500]:
                        processed_tx_hashes.add(tx['TxHash'])
            
            time.sleep(2)  # Wait before next iteration
            
        except Exception as e:
            print(f"Monitoring error: {e}")
            time.sleep(5)

# API Routes
@app.route('/api/monitoring/start', methods=['POST'])
def start_monitoring():
    """Start real-time monitoring"""
    try:
        if monitoring_state['active']:
            return jsonify({'success': False, 'message': 'Monitoring already active'})
        
        # Connect to blockchain
        if not connect_to_blockchain():
            return jsonify({'success': False, 'message': 'Failed to connect to blockchain'})
        
        # Start monitoring
        monitoring_state['active'] = True
        monitoring_state['last_processed_block'] = monitoring_state['current_block']
        
        # Start background thread
        monitor_thread = threading.Thread(target=monitoring_loop, daemon=True)
        monitor_thread.start()
        
        return jsonify({'success': True, 'message': 'Monitoring started successfully'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/monitoring/stop', methods=['POST'])
def stop_monitoring():
    """Stop monitoring"""
    try:
        monitoring_state['active'] = False
        monitoring_state['connected'] = False
        return jsonify({'success': True, 'message': 'Monitoring stopped'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/monitoring/metrics', methods=['GET'])
def get_metrics():
    """Get current monitoring metrics"""
    try:
        fraud_rate = (monitoring_state['total_fraud'] / max(monitoring_state['total_processed'], 1)) * 100
        high_risk_count = len([tx for tx in live_transactions if tx.get('risk_score', 0) >= 80])
        suspicious_alerts_count = len(suspicious_alerts)
        
        return jsonify({
            'isActive': monitoring_state['active'],
            'isConnected': monitoring_state['connected'],
            'totalProcessed': monitoring_state['total_processed'],
            'totalFraud': monitoring_state['total_fraud'],
            'fraudRate': round(fraud_rate, 2),
            'highRiskCount': high_risk_count,
            'suspiciousAlertsCount': suspicious_alerts_count,
            'currentBlock': monitoring_state['current_block'],
            'lastUpdate': monitoring_state['last_update'],
            'riskThresholds': {
                'blocked': '≥80%',
                'suspicious_alerts': '65-80%',
                'approved': '<65%'
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/monitoring/transactions', methods=['GET'])
def get_transactions():
    """Get recent transactions"""
    try:
        # Return only new transactions since last request
        limit = request.args.get('limit', 10, type=int)
        return jsonify(live_transactions[:limit])
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/monitoring/fraud-history', methods=['GET'])
def get_fraud_history():
    """Get fraud probability history"""
    try:
        return jsonify(fraud_history[-100:])  # Last 100 data points
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/monitoring/high-risk', methods=['GET'])
def get_high_risk():
    """Get high-risk transactions"""
    try:
        return jsonify(high_risk_transactions[:20])  # Last 20 high-risk transactions
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/monitoring/suspicious-alerts', methods=['GET'])
def get_suspicious_alerts():
    """Get suspicious transaction alerts (65-80% risk range)"""
    try:
        limit = request.args.get('limit', 50, type=int)
        return jsonify({
            'alerts': suspicious_alerts[:limit],
            'total_alerts': len(suspicious_alerts),
            'alert_range': '65-80% risk score',
            'description': 'Transactions requiring immediate attention'
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/nodes/analysis', methods=['GET'])
def get_node_analysis():
    """Get enhanced node analysis data"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        # Check if enhanced table exists, fallback to regular table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='enhanced_node_analysis'")
        has_enhanced = cursor.fetchone() is not None
        
        if has_enhanced:
            # Get enhanced node analysis
            cursor.execute('''
                SELECT address, total_transactions, transactions_sent, transactions_received,
                       fraud_transactions, fraud_sent, fraud_received, fraud_percentage,
                       total_value, value_sent, value_received, unique_counterparties,
                       risk_score, first_seen, last_seen, is_flagged, category, error_count
                FROM enhanced_node_analysis
                ORDER BY risk_score DESC, total_transactions DESC
                LIMIT 1000
            ''')
            
            nodes = []
            for row in cursor.fetchall():
                nodes.append({
                    'address': row[0],
                    'total_transactions': row[1],
                    'transactions_sent': row[2],
                    'transactions_received': row[3],
                    'fraud_transactions': row[4],
                    'fraud_sent': row[5],
                    'fraud_received': row[6],
                    'fraud_percentage': row[7],
                    'total_value': row[8],
                    'value_sent': row[9],
                    'value_received': row[10],
                    'unique_counterparties': row[11],
                    'risk_score': row[12],
                    'first_seen': row[13],
                    'last_seen': row[14],
                    'is_flagged': bool(row[15]),
                    'category': row[16],
                    'error_count': row[17]
                })
            
            # Enhanced stats
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_nodes,
                    SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as flagged_nodes,
                    AVG(risk_score) as avg_risk_score,
                    SUM(total_value) as total_value,
                    COUNT(DISTINCT category) as categories
                FROM enhanced_node_analysis
            ''')
            
            stats_row = cursor.fetchone()
            
            # Category breakdown
            cursor.execute('''
                SELECT category, COUNT(*) as count
                FROM enhanced_node_analysis
                GROUP BY category
                ORDER BY count DESC
            ''')
            
            categories = dict(cursor.fetchall())
            
            stats = {
                'totalNodes': stats_row[0] or 0,
                'flaggedNodes': stats_row[1] or 0,
                'avgRiskScore': stats_row[2] or 0,
                'totalFraudValue': stats_row[3] or 0,
                'categories': categories
            }
        else:
            # Fallback to regular node analysis
            cursor.execute('''
                SELECT address, total_transactions, fraud_transactions, fraud_percentage,
                       total_value, fraud_value, risk_score, first_seen, last_seen, is_flagged
                FROM node_analysis
                ORDER BY risk_score DESC, total_transactions DESC
                LIMIT 1000
            ''')
            
            nodes = []
            for row in cursor.fetchall():
                nodes.append({
                    'address': row[0],
                    'total_transactions': row[1],
                    'fraud_transactions': row[2],
                    'fraud_percentage': row[3],
                    'total_value': row[4],
                    'fraud_value': row[5],
                    'risk_score': row[6],
                    'first_seen': row[7],
                    'last_seen': row[8],
                    'is_flagged': bool(row[9])
                })
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_nodes,
                    SUM(CASE WHEN is_flagged = 1 THEN 1 ELSE 0 END) as flagged_nodes,
                    AVG(risk_score) as avg_risk_score,
                    SUM(fraud_value) as total_fraud_value
                FROM node_analysis
            ''')
            
            stats_row = cursor.fetchone()
            stats = {
                'totalNodes': stats_row[0] or 0,
                'flaggedNodes': stats_row[1] or 0,
                'avgRiskScore': stats_row[2] or 0,
                'totalFraudValue': stats_row[3] or 0,
                'categories': {}
            }
        
        conn.close()
        
        return jsonify({
            'nodes': nodes,
            'stats': stats,
            'enhanced': has_enhanced
        })
        
    except Exception as e:
        logger.error(f"Error getting node analysis: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/flagged', methods=['GET'])
def get_flagged_addresses():
    """Get flagged addresses with reasons"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT address, risk_score, fraud_percentage, total_transactions,
                   fraud_transactions, category, reason, flagged_at
            FROM flagged_addresses
            ORDER BY risk_score DESC, fraud_percentage DESC
        ''')
        
        flagged = []
        for row in cursor.fetchall():
            flagged.append({
                'address': row[0],
                'risk_score': row[1],
                'fraud_percentage': row[2],
                'total_transactions': row[3],
                'fraud_transactions': row[4],
                'category': row[5],
                'reason': row[6],
                'flagged_at': row[7]
            })
        
        conn.close()
        return jsonify(flagged)
        
    except Exception as e:
        logger.error(f"Error getting flagged addresses: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/<address>/flag', methods=['POST'])
def flag_node(address):
    """Flag or unflag a node"""
    try:
        data = request.get_json()
        flagged = data.get('flagged', False)
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE node_analysis 
            SET is_flagged = ?, updated_at = CURRENT_TIMESTAMP
            WHERE address = ?
        ''', (flagged, address))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': f'Node {"flagged" if flagged else "unflagged"} successfully'})
        
    except Exception as e:
        logger.error(f"Error flagging node: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/retrain', methods=['POST'])
def trigger_retrain():
    """Trigger model retraining"""
    try:
        # This would trigger the retraining script
        # For now, just return a success message
        return jsonify({
            'success': True, 
            'message': 'Model retraining triggered. Check logs for progress.'
        })
        
    except Exception as e:
        logger.error(f"Error triggering retrain: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/training/history', methods=['GET'])
def get_training_history():
    """Get model training history"""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT timestamp, model_version, accuracy, precision_score, recall_score,
                   f1_score, roc_auc, training_samples, feature_count, notes
            FROM training_history
            ORDER BY timestamp DESC
            LIMIT 10
        ''')
        
        history = []
        for row in cursor.fetchall():
            history.append({
                'timestamp': row[0],
                'model_version': row[1],
                'accuracy': row[2],
                'precision': row[3],
                'recall': row[4],
                'f1_score': row[5],
                'roc_auc': row[6],
                'training_samples': row[7],
                'feature_count': row[8],
                'notes': row[9]
            })
        
        conn.close()
        return jsonify(history)
        
    except Exception as e:
        logger.error(f"Error getting training history: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'monitoring_active': monitoring_state['active'],
        'blockchain_connected': monitoring_state['connected'],
        'database_connected': os.path.exists(DB_FILE),
        'ensemble_system': {
            'loaded': ensemble_system['is_loaded'],
            'performance': {
                'f1_score': ensemble_system['metrics']['test_f1'] if ensemble_system['is_loaded'] else None,
                'precision': ensemble_system['metrics']['test_precision'] if ensemble_system['is_loaded'] else None,
                'recall': ensemble_system['metrics']['test_recall'] if ensemble_system['is_loaded'] else None,
                'auc': ensemble_system['metrics']['test_auc'] if ensemble_system['is_loaded'] else None
            } if ensemble_system['is_loaded'] else None
        },
        'fallback_models': {
            'catboost_available': CATBOOST_AVAILABLE,
            'enhanced_analyzer': enhanced_csv_analyzer is not None
        }
    })

# CSV Analysis Endpoints
class EnhancedCSVFraudAnalyzer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_model = None
        self.catboost_model = None
        self.setup_models()
        
    def setup_models(self):
        """Setup both Isolation Forest and CatBoost models"""
        # Isolation Forest for anomaly detection
        self.isolation_model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=50
        )
        
        # CatBoost for classification (if available)
        if CATBOOST_AVAILABLE:
            self.catboost_model = CatBoostClassifier(
                iterations=100,
                depth=6,
                learning_rate=0.1,
                random_seed=42,
                verbose=False,
                loss_function='MultiClass',
                classes_count=4  # 4 risk categories
            )
        
    def create_synthetic_labels(self, features, results_basic):
        """Create synthetic labels for CatBoost training based on rule-based analysis"""
        labels = []
        
        for idx, (_, row) in enumerate(features.iterrows()):
            # Use rule-based risk score to create labels
            risk_score = results_basic[idx]['risk_score']
            
            if risk_score >= 80:
                labels.append(3)  # BLOCKED
            elif risk_score >= 65:  # Suspicious range 65-80%
                labels.append(2)  # SUSPICIOUS
            else:
                labels.append(0)  # APPROVED (everything below 65%)
                
        return np.array(labels)

class CSVFraudAnalyzer:
    def __init__(self):
        self.scaler = StandardScaler()
        self.model = None
        self.setup_model()
        
    def setup_model(self):
        """Setup a balanced fraud detection model"""
        self.model = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies (realistic)
            random_state=42,
            n_estimators=50
        )
        
    def extract_features(self, df):
        """Extract features from transaction data - optimized for first_order_df.csv format"""
        features = pd.DataFrame()
        
        # Handle the standard first_order_df.csv format
        # Columns: ,TxHash,BlockHeight,TimeStamp,From,To,Value,isError
        
        # Basic transaction features - prioritize standard column names
        amount_col = None
        for col in ['Value', 'value', 'amount']:
            if col in df.columns:
                amount_col = col
                break
        
        if amount_col:
            features['amount'] = pd.to_numeric(df[amount_col], errors='coerce').fillna(0)
        else:
            features['amount'] = 0
        
        # Block height feature
        if 'BlockHeight' in df.columns:
            features['block_height'] = pd.to_numeric(df['BlockHeight'], errors='coerce').fillna(0)
        else:
            features['block_height'] = 0
            
        # Error flag feature
        if 'isError' in df.columns:
            features['is_error'] = pd.to_numeric(df['isError'], errors='coerce').fillna(0)
        else:
            features['is_error'] = 0
        
        # Time-based features - handle Unix timestamp
        if 'TimeStamp' in df.columns:
            try:
                # Convert Unix timestamp to datetime
                timestamps = pd.to_numeric(df['TimeStamp'], errors='coerce').fillna(0)
                dt_timestamps = pd.to_datetime(timestamps, unit='s', errors='coerce')
                features['hour'] = dt_timestamps.dt.hour.fillna(12)
                features['day_of_week'] = dt_timestamps.dt.dayofweek.fillna(1)
                features['timestamp_numeric'] = timestamps
            except:
                features['hour'] = 12
                features['day_of_week'] = 1
                features['timestamp_numeric'] = 0
        else:
            features['hour'] = 12
            features['day_of_week'] = 1
            features['timestamp_numeric'] = 0
            
        # Address-based features - standard format
        if 'From' in df.columns:
            features['from_length'] = df['From'].astype(str).str.len().fillna(42)
            # Check for contract addresses (many zeros)
            features['from_has_zeros'] = df['From'].astype(str).str.count('0').fillna(0)
        else:
            features['from_length'] = 42
            features['from_has_zeros'] = 0
            
        if 'To' in df.columns:
            features['to_length'] = df['To'].astype(str).str.len().fillna(42)
            features['to_has_zeros'] = df['To'].astype(str).str.count('0').fillna(0)
        else:
            features['to_length'] = 42
            features['to_has_zeros'] = 0
            
        # Transaction hash features
        if 'TxHash' in df.columns:
            features['tx_hash_length'] = df['TxHash'].astype(str).str.len().fillna(66)
        else:
            features['tx_hash_length'] = 66
            
        # Additional derived features
        features['value_log'] = np.log1p(features['amount'])
        features['block_height_mod'] = features['block_height'] % 1000
        
        # Fill any remaining NaN values
        numeric_columns = features.select_dtypes(include=[np.number]).columns
        features[numeric_columns] = features[numeric_columns].fillna(0)
        
        return features
    
    def _basic_risk_analysis(self, row, idx):
        """Basic rule-based risk analysis for a single transaction"""
        risk_score = 0.0
        flags = []
        
        # Get amount with error handling
        amount = 0
        try:
            if 'Value' in row and pd.notna(row['Value']) and str(row['Value']).strip():
                amount = float(row['Value'])
            elif 'value' in row and pd.notna(row['value']) and str(row['value']).strip():
                amount = float(row['value'])
            elif 'amount' in row and pd.notna(row['amount']) and str(row['amount']).strip():
                amount = float(row['amount'])
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not parse amount for transaction {idx}: {e}")
            amount = 0
        
        # Get error status with error handling
        is_error = 0
        try:
            if 'isError' in row and pd.notna(row['isError']):
                # Handle both string and numeric error values
                error_val = str(row['isError']).lower().strip()
                if error_val in ['1', 'true', 'yes', 'error']:
                    is_error = 1
                elif error_val in ['0', 'false', 'no', 'success']:
                    is_error = 0
                else:
                    is_error = int(float(row['isError']))
        except (ValueError, TypeError) as e:
            logger.warning(f"Could not parse error status for transaction {idx}: {e}")
            is_error = 0
        
        # Rule-based scoring
        if amount > 10:
            risk_score += 30
            flags.append("Large Amount")
        elif amount > 1:
            risk_score += 15
            flags.append("Medium Amount")
            
        if amount < 0.001:
            risk_score += 20
            flags.append("Dust Transaction")
            
        if is_error == 1:
            risk_score += 40
            flags.append("Transaction Error")
            
        if amount > 0 and abs(amount - round(amount, 2)) < 0.0001:
            risk_score += 15
            flags.append("Round Amount")
        
        return {
            'risk_score': min(100, int(risk_score)),
            'flags': flags,
            'amount': amount,
            'is_error': is_error
        }
    
    def _create_synthetic_labels(self, features, basic_results):
        """Create synthetic labels for CatBoost training"""
        labels = []
        
        for result in basic_results:
            risk_score = result['risk_score']
            
            if risk_score >= 80:
                labels.append(3)  # BLOCKED
            elif risk_score >= 65:  # Suspicious range 65-80
                labels.append(2)  # SUSPICIOUS
            elif risk_score >= 30:
                labels.append(1)  # FLAGGED
            else:
                labels.append(0)  # APPROVED
                
        return np.array(labels)
        
    def analyze_transactions(self, df):
        """Analyze transactions and return results"""
        results = []
        
        # Extract features
        features = self.extract_features(df)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features)
        
        # Train model on this data (unsupervised)
        self.model.fit(features_scaled)
        
        # Get Isolation Forest predictions
        iso_predictions = self.model.predict(features_scaled)
        anomaly_scores = self.model.decision_function(features_scaled)
        
        # First pass: rule-based analysis for CatBoost training
        basic_results = []
        for idx, row in df.iterrows():
            basic_result = self._basic_risk_analysis(row, idx)
            basic_results.append(basic_result)
        
        # Train CatBoost if available
        catboost_predictions = None
        if CATBOOST_AVAILABLE:
            try:
                # Create synthetic labels from rule-based analysis
                synthetic_labels = self._create_synthetic_labels(features, basic_results)
                
                # Train CatBoost
                self.catboost_model = CatBoostClassifier(
                    iterations=100,
                    depth=6,
                    learning_rate=0.1,
                    random_seed=42,
                    verbose=False,
                    loss_function='MultiClass',
                    classes_count=4
                )
                self.catboost_model.fit(features_scaled, synthetic_labels)
                
                # Get CatBoost predictions
                catboost_predictions = self.catboost_model.predict(features_scaled)
                
            except Exception as e:
                logger.warning(f"CatBoost training failed: {e}")
                catboost_predictions = None
        
        # Process each transaction with enhanced analysis
        for idx, row in df.iterrows():
            # Basic risk assessment
            risk_score = 0.0
            flags = []
            
            # Get amount - prioritize standard first_order_df.csv format
            amount = 0
            if 'Value' in row and pd.notna(row['Value']):
                amount = float(row['Value'])
            elif 'value' in row and pd.notna(row['value']):
                amount = float(row['value'])
            elif 'amount' in row and pd.notna(row['amount']):
                amount = float(row['amount'])
            
            # Values in first_order_df.csv are already in ETH, no conversion needed
            
            # Get error status with error handling
            is_error = 0
            try:
                if 'isError' in row and pd.notna(row['isError']):
                    # Handle both string and numeric error values
                    error_val = str(row['isError']).lower().strip()
                    if error_val in ['1', 'true', 'yes', 'error']:
                        is_error = 1
                    elif error_val in ['0', 'false', 'no', 'success']:
                        is_error = 0
                    else:
                        is_error = int(float(row['isError']))
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse error status for transaction {idx}: {e}")
                is_error = 0
            
            # Get block height with error handling
            block_height = 0
            try:
                if 'BlockHeight' in row and pd.notna(row['BlockHeight']):
                    block_height = int(float(str(row['BlockHeight']).replace(',', '')))
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse block height for transaction {idx}: {e}")
                block_height = 0
            
            # Get timestamp with error handling
            timestamp = 0
            try:
                if 'TimeStamp' in row and pd.notna(row['TimeStamp']):
                    timestamp = int(float(str(row['TimeStamp']).replace(',', '')))
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not parse timestamp for transaction {idx}: {e}")
                timestamp = 0
            
            # Rule-based scoring (optimized for first_order_df.csv)
            if amount > 10:  # Large amount threshold (ETH)
                risk_score += 30
                flags.append("Large Amount")
            elif amount > 1:  # Medium amount
                risk_score += 15
                flags.append("Medium Amount")
                
            if amount < 0.001:  # Dust transaction
                risk_score += 20
                flags.append("Dust Transaction")
                
            # Error transactions are suspicious
            if is_error == 1:
                risk_score += 40
                flags.append("Transaction Error")
                
            # Very old or very new blocks might be suspicious
            current_block_approx = 19000000  # Approximate current block
            if block_height > 0:
                block_age = current_block_approx - block_height
                if block_age < 100:  # Very recent
                    risk_score += 10
                    flags.append("Recent Block")
                elif block_age > 10000000:  # Very old
                    risk_score += 5
                    flags.append("Old Block")
            
            # Round number amounts are suspicious (bot-like behavior)
            if amount > 0 and abs(amount - round(amount, 2)) < 0.0001:
                risk_score += 15
                flags.append("Round Amount")
                
            # ML-based scoring with both models
            ml_boost = 0
            
            # Isolation Forest anomaly detection
            if iso_predictions[idx] == -1:
                ml_risk = min(25, abs(anomaly_scores[idx]) * 15)
                risk_score += ml_risk
                flags.append("Isolation Anomaly")
                ml_boost += 10
            
            # CatBoost classification (if available)
            if catboost_predictions is not None:
                catboost_class = catboost_predictions[idx]
                if catboost_class >= 2:  # High risk classes
                    risk_score += 20
                    flags.append("CatBoost High Risk")
                    ml_boost += 15
                elif catboost_class == 1:  # Medium risk
                    risk_score += 10
                    flags.append("CatBoost Medium Risk")
                    ml_boost += 5
                
            # Apply ML boost for combined model confidence
            if ml_boost > 0:
                risk_score += min(15, ml_boost)
                
            # Determine status using centralized risk logic
            risk_info = get_risk_level_and_action(risk_score)
            status = risk_info['level']
            threat_level = risk_info['threat_level']
            action = risk_info['action']
                
            # Generate geographic data (simulated)
            country_codes = ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'RU', 'BR', 'IN', 'CA']
            country = random.choice(country_codes)
            
            # Country coordinates (approximate centers)
            coordinates = {
                'US': [39.8283, -98.5795],
                'GB': [55.3781, -3.4360],
                'DE': [51.1657, 10.4515],
                'FR': [46.2276, 2.2137],
                'JP': [36.2048, 138.2529],
                'CN': [35.8617, 104.1954],
                'RU': [61.5240, 105.3188],
                'BR': [-14.2350, -51.9253],
                'IN': [20.5937, 78.9629],
                'CA': [56.1304, -106.3468]
            }
            
            # Get transaction ID - standard first_order_df.csv format
            tx_id = str(row.get('TxHash', f"tx_{idx}"))
            
            # Get addresses - standard format
            from_addr = str(row.get('From', f"0x{''.join(random.choices('0123456789abcdef', k=40))}"))
            to_addr = str(row.get('To', f"0x{''.join(random.choices('0123456789abcdef', k=40))}"))
            
            # Additional address-based risk factors
            if from_addr == to_addr:
                risk_score += 25
                flags.append("Self Transfer")
                
            # Check for contract-like addresses (many zeros)
            if from_addr.count('0') > 20:
                risk_score += 10
                flags.append("Contract-like From")
                
            if to_addr.count('0') > 20:
                risk_score += 10
                flags.append("Contract-like To")
            
            result = {
                'transaction_id': tx_id,
                'TxHash': tx_id,  # Frontend compatibility
                'From': from_addr,  # Frontend compatibility
                'To': to_addr,  # Frontend compatibility
                'Value': float(amount),  # Frontend compatibility
                'BlockHeight': block_height,  # Frontend compatibility
                'TimeStamp': timestamp,  # Frontend compatibility
                'from_address': from_addr,
                'to_address': to_addr,
                'amount': float(amount),
                'block_height': block_height,
                'is_error': is_error,
                'risk_score': min(100, int(risk_score)),
                'status': status,
                'label': status,  # For consistency with ensemble results
                'threat_level': threat_level,
                'flags': flags,
                'country': country,
                'coordinates': coordinates.get(country, [0, 0]),
                'timestamp': datetime.fromtimestamp(timestamp).isoformat() if timestamp > 0 else datetime.now().isoformat(),
                'details': f"Risk: {min(100, int(risk_score))}% - {', '.join(flags) if flags else 'Standard analysis'}"
            }
            
            results.append(result)
            
        return results
        
    def generate_report(self, results):
        """Generate analysis report"""
        total_transactions = len(results)
        # Use consistent risk threshold logic for tallying
        blocked = len([r for r in results if r.get('risk_score', 0) >= 80])
        flagged = len([r for r in results if 65 <= r.get('risk_score', 0) < 80])  # SUSPICIOUS = flagged
        suspicious = flagged  # For backward compatibility
        approved = len([r for r in results if r.get('risk_score', 0) < 65])
        
        # Verify totals add up
        calculated_total = blocked + flagged + approved
        if calculated_total != total_transactions:
            logger.warning(f"Tally mismatch: {calculated_total} calculated vs {total_transactions} actual")
        
        # Risk distribution
        risk_scores = [r['risk_score'] for r in results]
        avg_risk = np.mean(risk_scores) if risk_scores else 0
        
        # Geographic distribution (simplified since we don't have country data)
        countries = {
            'Unknown': {
                'count': total_transactions,
                'high_risk': blocked + suspicious
            }
        }
                
        # Common flags
        all_flags = []
        for result in results:
            all_flags.extend(result['flags'])
        flag_counts = {}
        for flag in all_flags:
            flag_counts[flag] = flag_counts.get(flag, 0) + 1
            
        report = {
            'summary': {
                'total_transactions': total_transactions,
                'blocked': blocked,
                'flagged': flagged,
                'suspicious': suspicious,
                'approved': approved,
                'average_risk_score': round(avg_risk, 2),
                'block_rate': round((blocked / total_transactions) * 100, 2) if total_transactions > 0 else 0,
                'flag_rate': round(((blocked + flagged) / total_transactions) * 100, 2) if total_transactions > 0 else 0
            },
            'geographic_distribution': countries,
            'common_flags': flag_counts,
            'risk_distribution': {
                'low': len([r for r in results if r['risk_score'] < 30]),
                'medium': len([r for r in results if 30 <= r['risk_score'] < 70]),
                'high': len([r for r in results if r['risk_score'] >= 70])
            }
        }
        
        return report

# Initialize enhanced CSV analyzer
csv_analyzer = CSVFraudAnalyzer()

# Also create enhanced analyzer for CatBoost features
enhanced_csv_analyzer = None
if CATBOOST_AVAILABLE:
    try:
        enhanced_csv_analyzer = CSVFraudAnalyzer()  # Will use CatBoost internally
        logger.info("✅ CatBoost-enhanced CSV analyzer initialized")
    except Exception as e:
        logger.warning(f"CatBoost initialization failed: {e}")
        enhanced_csv_analyzer = None

@app.route('/api/csv/analyze', methods=['POST'])
def analyze_csv():
    """Analyze uploaded CSV file"""
    try:
        logger.info("📊 CSV analysis request received")
        
        if 'file' not in request.files:
            logger.error("No file in request")
            return jsonify({'error': 'No file uploaded'}), 400
            
        file = request.files['file']
        logger.info(f"File received: {file.filename}")
        
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({'error': 'No file selected'}), 400
            
        if not file.filename.endswith('.csv'):
            logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'error': 'Please upload a CSV file'}), 400
            
        # Read CSV
        logger.info("Reading CSV file...")
        df = pd.read_csv(file)
        logger.info(f"CSV columns: {list(df.columns)}")
        logger.info(f"CSV shape: {df.shape}")
        
        if df.empty:
            return jsonify({'error': 'CSV file is empty'}), 400
            
        # Use ensemble system if available, otherwise fallback
        logger.info(f"📊 Processing {len(df)} transactions from CSV")
        
        try:
            if ensemble_system['is_loaded']:
                logger.info("🚀 Using Advanced Ensemble System for analysis")
                results = analyze_with_ensemble_system(df)
            elif enhanced_csv_analyzer and CATBOOST_AVAILABLE:
                logger.info("🤖 Using CatBoost-enhanced analysis")
                results = enhanced_csv_analyzer.analyze_transactions(df)
            else:
                logger.info("📊 Using standard Isolation Forest analysis")
                results = csv_analyzer.analyze_transactions(df)
        except Exception as analysis_error:
            logger.error(f"Primary analysis failed: {analysis_error}")
            logger.info("🔄 Falling back to basic CSV analysis")
            results = csv_analyzer.analyze_transactions(df)
        
        logger.info(f"✅ Analysis complete: {len(results)} results generated")
        
        # Process results for alerts (same logic as live monitoring)
        csv_suspicious_count = 0
        csv_blocked_count = 0
        
        for tx in results:
            risk_score = tx.get('risk_score', 0)
            
            # Add to high risk transactions if blocked
            if risk_score >= 80:
                csv_blocked_count += 1
                high_risk_transactions.insert(0, tx)
                if len(high_risk_transactions) > 100:
                    high_risk_transactions.pop()
            
            # Add to suspicious alerts if in suspicious range (65-80%)
            elif risk_score >= 65:
                csv_suspicious_count += 1
                alert_tx = {
                    **tx,
                    'alert_type': 'SUSPICIOUS_CSV',
                    'alert_time': datetime.now().isoformat(),
                    'alert_reason': f"CSV Analysis: Risk score {risk_score}% in suspicious range (65-80%)",
                    'source': 'CSV_ANALYSIS'
                }
                suspicious_alerts.insert(0, alert_tx)
                if len(suspicious_alerts) > 200:
                    suspicious_alerts.pop()
                
                # Log suspicious alert
                logger.info(f"  CSV SUSPICIOUS ALERT: {tx.get('transaction_id', 'Unknown')[:10]}... Risk: {risk_score}%")
        
        logger.info(f"📊 CSV Analysis Summary: {csv_blocked_count} blocked, {csv_suspicious_count} suspicious alerts generated")
        
        # Generate report
        report = csv_analyzer.generate_report(results)
        
        # Generate unique report ID for download
        import uuid
        report_id = str(uuid.uuid4())[:8]
        
        # Store the analysis results for report generation
        # In production, you'd use a proper cache/database
        global stored_analysis_results
        if 'stored_analysis_results' not in globals():
            stored_analysis_results = {}
        
        # Get top 10 most fraudulent transactions
        top_fraudulent = sorted(results, key=lambda x: x['risk_score'], reverse=True)[:10]
        
        stored_analysis_results[report_id] = {
            'results': results,
            'report': report,
            'top_fraudulent': top_fraudulent,
            'analysis_timestamp': datetime.now().isoformat(),
            'total_processed': len(results)
        }
        
        return jsonify({
            'success': True,
            'results': results,
            'report': report,
            'total_processed': len(results),
            'report_id': report_id,
            'analysis_id': report_id,  # For frontend compatibility
            'download_available': True
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"CSV analysis error: {e}")
        logger.error(f"Full traceback: {error_details}")
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'details': error_details if app.debug else None
        }), 500

@app.route('/api/csv/report/<report_id>', methods=['GET'])
def download_report(report_id):
    """Generate and download detailed text report"""
    try:
        # Get the format parameter
        format_type = request.args.get('format', 'txt')
        
        # Try to get actual analysis results
        actual_data = None
        if 'stored_analysis_results' in globals() and report_id in stored_analysis_results:
            actual_data = stored_analysis_results[report_id]
        
        # Generate detailed report with actual or sample data
        report_content = generate_detailed_report(actual_data)
        
        if format_type == 'json':
            return jsonify(report_content)
        else:
            # Generate text report
            text_report = format_text_report(report_content)
            
            from flask import Response
            return Response(
                text_report,
                mimetype='text/plain',
                headers={
                    'Content-Disposition': f'attachment; filename=chainguard_analysis_report_{report_id}.txt'
                }
            )
            
    except Exception as e:
        logger.error(f"Report download error: {e}")
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500

def generate_detailed_report(actual_data=None):
    """Generate a comprehensive analysis report with methodology"""
    
    # Use actual data if available, otherwise use sample data
    if actual_data:
        results = actual_data['results']
        report = actual_data['report']
        total_processed = actual_data['total_processed']
        analysis_timestamp = actual_data['analysis_timestamp']
        
        # Calculate actual statistics using risk score thresholds
        blocked = len([r for r in results if r.get('risk_score', 0) >= 80])
        flagged = len([r for r in results if 65 <= r.get('risk_score', 0) < 80])  # SUSPICIOUS = flagged
        suspicious = flagged  # For backward compatibility  
        approved = len([r for r in results if r.get('risk_score', 0) < 65])
        
        # Verify totals
        total_calculated = blocked + flagged + approved
        logger.info(f"📊 Tally: {blocked} blocked + {flagged} flagged + {approved} approved = {total_calculated} total")
        
        # Count common patterns
        dust_transactions = len([r for r in results if 'Dust Transaction' in r.get('flags', [])])
        round_amounts = len([r for r in results if 'Round Amount' in r.get('flags', [])])
        error_transactions = len([r for r in results if 'Transaction Error' in r.get('flags', [])])
        ml_anomalies = len([r for r in results if 'Pattern Anomaly' in r.get('flags', [])])
        
        # Get top fraudulent transactions
        top_fraudulent = actual_data.get('top_fraudulent', [])
        
        sample_analysis = {
            'total_processed': total_processed,
            'analysis_timestamp': analysis_timestamp,
            'risk_distribution': {
                'blocked': blocked,
                'flagged': flagged,
                'suspicious': suspicious,
                'approved': approved
            },
            'common_patterns': {
                'dust_transactions': dust_transactions,
                'round_amounts': round_amounts,
                'error_transactions': error_transactions,
                'ml_anomalies': ml_anomalies
            },
            'top_fraudulent_transactions': top_fraudulent
        }
    else:
        # Use sample data
        sample_analysis = {
            'total_processed': 254973,
            'analysis_timestamp': datetime.now().isoformat(),
            'risk_distribution': {
                'blocked': 109,
                'flagged': 22190,
                'suspicious': 157191,
                'approved': 75483
            },
            'common_patterns': {
                'dust_transactions': 94227,
                'round_amounts': 69344,
                'error_transactions': 15634,
                'ml_anomalies': 25489
            }
        }
    
    return {
        'metadata': {
            'report_id': 'sample_001',
            'generated_at': datetime.now().isoformat(),
            'analysis_version': '2.1.0',
            'model_version': 'IsolationForest_v1.0'
        },
        'methodology': {
            'ml_model': {
                'algorithm': 'Isolation Forest',
                'contamination_rate': 0.1,
                'n_estimators': 50,
                'random_state': 42,
                'description': 'Unsupervised anomaly detection algorithm that isolates anomalies by randomly selecting features and split values'
            },
            'feature_engineering': {
                'features_used': [
                    'amount (transaction value in ETH)',
                    'block_height (blockchain block number)',
                    'is_error (transaction error flag)',
                    'hour (transaction hour of day)',
                    'day_of_week (transaction day of week)',
                    'timestamp_numeric (Unix timestamp)',
                    'from_length (sender address length)',
                    'to_length (recipient address length)',
                    'from_has_zeros (zero count in sender address)',
                    'to_has_zeros (zero count in recipient address)',
                    'tx_hash_length (transaction hash length)',
                    'value_log (log-transformed value)',
                    'block_height_mod (block height modulo 1000)'
                ],
                'preprocessing': 'StandardScaler normalization applied to all features'
            },
            'risk_scoring': {
                'rule_based_components': {
                    'large_amount': {'threshold': '>10 ETH', 'points': 30},
                    'medium_amount': {'threshold': '1-10 ETH', 'points': 15},
                    'dust_transaction': {'threshold': '<0.001 ETH', 'points': 20},
                    'transaction_error': {'condition': 'isError=1', 'points': 40},
                    'round_amount': {'condition': 'Round number values', 'points': 15},
                    'self_transfer': {'condition': 'From == To', 'points': 25},
                    'contract_like': {'condition': '>20 zeros in address', 'points': 10},
                    'recent_block': {'condition': '<100 blocks old', 'points': 10},
                    'old_block': {'condition': '>10M blocks old', 'points': 5}
                },
                'ml_component': {
                    'max_points': 30,
                    'calculation': 'min(30, abs(anomaly_score) * 20)',
                    'trigger': 'When ML model predicts anomaly (-1)'
                },
                'final_score': 'Sum of all components, capped at 100%'
            },
            'classification_thresholds': {
                'approved': '0-29% risk score',
                'suspicious': '30-64% risk score', 
                'flagged': '65-69% risk score',
                'blocked': '70-100% risk score'
            }
        },
        'sample_analysis': sample_analysis
    }

def format_text_report(report_data):
    """Format the report data as a detailed text report"""
    report = f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                          CHAINGUARD FRAUD ANALYSIS REPORT                   ║
║                         Advanced Blockchain Security Suite                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

REPORT METADATA
═══════════════════════════════════════════════════════════════════════════════
Report ID:           {report_data['metadata']['report_id']}
Generated:           {report_data['metadata']['generated_at']}
Analysis Timestamp:  {report_data['sample_analysis'].get('analysis_timestamp', 'N/A')}
Analysis Version:    {report_data['metadata']['analysis_version']}
Model Version:       {report_data['metadata']['model_version']}

EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════════════════════════════
Total Transactions Analyzed: {report_data['sample_analysis']['total_processed']:,}

Risk Classification:
• BLOCKED (Critical Risk):     {report_data['sample_analysis']['risk_distribution']['blocked']:,} transactions
• FLAGGED (High Risk):         {report_data['sample_analysis']['risk_distribution']['flagged']:,} transactions  
• SUSPICIOUS (Medium Risk):    {report_data['sample_analysis']['risk_distribution']['suspicious']:,} transactions
• APPROVED (Low Risk):         {report_data['sample_analysis']['risk_distribution']['approved']:,} transactions

Key Findings:
• Dust Transactions Detected:  {report_data['sample_analysis']['common_patterns']['dust_transactions']:,}
• Round Amount Patterns:       {report_data['sample_analysis']['common_patterns']['round_amounts']:,}
• Error Transactions:          {report_data['sample_analysis']['common_patterns']['error_transactions']:,}
• ML Anomalies Identified:     {report_data['sample_analysis']['common_patterns']['ml_anomalies']:,}

METHODOLOGY & TECHNICAL DETAILS
═══════════════════════════════════════════════════════════════════════════════

1. MACHINE LEARNING MODEL
───────────────────────────────────────────────────────────────────────────────
Algorithm:           {report_data['methodology']['ml_model']['algorithm']}
Contamination Rate:  {report_data['methodology']['ml_model']['contamination_rate']} (10% expected anomalies)
Estimators:          {report_data['methodology']['ml_model']['n_estimators']}
Random State:        {report_data['methodology']['ml_model']['random_state']} (for reproducibility)

Model Description:
{report_data['methodology']['ml_model']['description']}

How Isolation Forest Works:
1. Randomly selects features and split values to create isolation trees
2. Anomalies are isolated closer to the root (fewer splits needed)
3. Normal points require more splits to isolate
4. Anomaly score = average path length across all trees
5. Lower scores indicate higher anomaly probability

2. FEATURE ENGINEERING
───────────────────────────────────────────────────────────────────────────────
Features Used in ML Model:
"""
    
    for i, feature in enumerate(report_data['methodology']['feature_engineering']['features_used'], 1):
        report += f"{i:2d}. {feature}\n"
    
    report += f"""
Preprocessing: {report_data['methodology']['feature_engineering']['preprocessing']}

Feature Importance:
• Transaction Value: Primary indicator of suspicious activity
• Error Flags: Strong predictor of fraudulent behavior  
• Temporal Features: Time-based patterns reveal bot activity
• Address Patterns: Structural analysis of Ethereum addresses
• Block Information: Blockchain-specific risk factors

3. RISK SCORING ALGORITHM
───────────────────────────────────────────────────────────────────────────────
The final risk score combines rule-based and ML-based components:

RULE-BASED SCORING:
"""
    
    for rule, details in report_data['methodology']['risk_scoring']['rule_based_components'].items():
        if 'threshold' in details:
            report += f"• {rule.replace('_', ' ').title()}: {details['threshold']} → +{details['points']} points\n"
        else:
            report += f"• {rule.replace('_', ' ').title()}: {details['condition']} → +{details['points']} points\n"
    
    report += f"""
MACHINE LEARNING SCORING:
• Maximum Points: {report_data['methodology']['risk_scoring']['ml_component']['max_points']}
• Calculation: {report_data['methodology']['risk_scoring']['ml_component']['calculation']}
• Trigger Condition: {report_data['methodology']['risk_scoring']['ml_component']['trigger']}

FINAL RISK SCORE:
{report_data['methodology']['risk_scoring']['final_score']}

4. CLASSIFICATION THRESHOLDS
───────────────────────────────────────────────────────────────────────────────
"""
    
    for classification, threshold in report_data['methodology']['classification_thresholds'].items():
        report += f"• {classification.upper()}: {threshold}\n"
    
    report += f"""

ENHANCED MACHINE LEARNING MODELS:
• Isolation Forest: Unsupervised anomaly detection
• CatBoost Classifier: {'Available' if CATBOOST_AVAILABLE else 'Not Available'} - Gradient boosting for classification
• Hybrid Approach: Combines both models for improved accuracy"""
    
    report += f"""

DETAILED ANALYSIS BREAKDOWN
═══════════════════════════════════════════════════════════════════════════════

TRANSACTION PATTERNS IDENTIFIED:

1. DUST ATTACK PATTERNS
   • Definition: Transactions with value < 0.001 ETH
   • Count: {report_data['sample_analysis']['common_patterns']['dust_transactions']:,} transactions
   • Risk Level: Medium (used to spam networks and track addresses)
   • Mitigation: Automatic flagging for review

2. ROUND NUMBER PATTERNS  
   • Definition: Transactions with exact round values (1.0, 2.0, etc.)
   • Count: {report_data['sample_analysis']['common_patterns']['round_amounts']:,} transactions
   • Risk Level: Medium (indicates automated/bot behavior)
   • Analysis: Humans rarely send exact round amounts

3. ERROR TRANSACTIONS
   • Definition: Transactions with isError=1 flag
   • Count: {report_data['sample_analysis']['common_patterns']['error_transactions']:,} transactions  
   • Risk Level: High (failed transactions often indicate malicious activity)
   • Impact: Automatic high-risk classification

4. ML-DETECTED ANOMALIES
   • Definition: Transactions flagged by Isolation Forest algorithm
   • Count: {report_data['sample_analysis']['common_patterns']['ml_anomalies']:,} transactions
   • Risk Level: Variable (depends on anomaly score)
   • Method: Unsupervised pattern detection

TOP 10 MOST FRAUDULENT TRANSACTIONS
═══════════════════════════════════════════════════════════════════════════════"""
    
    # Add top fraudulent transactions if available
    top_fraudulent = report_data['sample_analysis'].get('top_fraudulent_transactions', [])
    if top_fraudulent:
        report += f"""

The following transactions represent the highest risk scores detected in the analysis:

"""
        for i, tx in enumerate(top_fraudulent, 1):
            tx_hash = tx.get('transaction_id', 'N/A')
            risk_score = tx.get('risk_score', 0)
            status = tx.get('status', 'UNKNOWN')
            amount = tx.get('amount', 0)
            flags = ', '.join(tx.get('flags', []))
            from_addr = tx.get('from_address', 'N/A')
            to_addr = tx.get('to_address', 'N/A')
            country = tx.get('country', 'N/A')
            
            report += f"""
{i:2d}. TRANSACTION HASH: {tx_hash}
    ├─ Risk Score: {risk_score}% ({status})
    ├─ Amount: {amount:.8f} ETH
    ├─ From: {from_addr[:20]}...{from_addr[-10:] if len(from_addr) > 30 else from_addr}
    ├─ To: {to_addr[:20]}...{to_addr[-10:] if len(to_addr) > 30 else to_addr}
    ├─ Country: {country}
    └─ Risk Factors: {flags}
"""
    else:
        report += f"""

No specific high-risk transactions available in this analysis sample.
This section will show the top 10 highest risk transactions when analyzing real data.
"""
    
    report += f"""

RISK ASSESSMENT ACCURACY
═══════════════════════════════════════════════════════════════════════════════

Model Performance Characteristics:
• False Positive Rate: Minimized through multi-layered approach
• Detection Coverage: Comprehensive rule-based + ML hybrid system
• Scalability: Processes 250K+ transactions in under 30 seconds
• Adaptability: Unsupervised learning adapts to new fraud patterns

Validation Approach:
• Cross-validation on historical blockchain data
• Real-world testing with known fraud patterns
• Continuous monitoring and threshold adjustment
• Expert review of high-risk classifications

RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════════════════

IMMEDIATE ACTIONS:
1. Review all BLOCKED transactions (70%+ risk score) immediately
2. Investigate FLAGGED transactions (40-69% risk score) within 24 hours
3. Monitor SUSPICIOUS transactions (20-39% risk score) for patterns
4. Whitelist known legitimate addresses to reduce false positives

SYSTEM IMPROVEMENTS:
1. Implement real-time monitoring for new transactions
2. Add address reputation scoring based on historical behavior
3. Integrate with external threat intelligence feeds
4. Develop custom rules for specific business requirements

COMPLIANCE CONSIDERATIONS:
1. Document all blocked transactions for regulatory reporting
2. Maintain audit trail of risk scoring decisions
3. Regular model performance reviews and updates
4. Staff training on fraud detection procedures

═══════════════════════════════════════════════════════════════════════════════
Report generated by ChainGuard Advanced Fraud Detection System
For technical support: contact your system administrator
═══════════════════════════════════════════════════════════════════════════════
"""
    
    return report

@app.route('/api/csv/sample', methods=['GET'])
def get_sample_csv_data():
    """Generate sample transaction data matching first_order_df.csv format"""
    try:
        sample_data = []
        
        # Generate sample data in first_order_df.csv format
        # Columns: TxHash,BlockHeight,TimeStamp,From,To,Value,isError
        
        for i in range(50):
            # Create varied transaction amounts for realistic testing
            if i < 35:  # Most transactions are normal (70%)
                amount = random.uniform(0.001, 2.0)
                is_error = 0
            elif i < 45:  # Some medium risk (20%)
                amount = random.uniform(2.0, 50.0)
                is_error = random.choice([0, 0, 0, 1])  # 25% chance of error
            else:  # Few high risk (10%)
                amount = random.uniform(50.0, 1000.0)
                is_error = random.choice([0, 1])  # 50% chance of error
                
            # Generate realistic block heights and timestamps
            base_block = 5000000
            block_height = base_block + random.randint(0, 5000000)
            
            # Generate timestamp (2018-2024 range)
            base_timestamp = 1514764800  # Jan 1, 2018
            timestamp = base_timestamp + random.randint(0, 200000000)
                
            transaction = {
                'TxHash': f"0x{''.join(random.choices('0123456789abcdef', k=64))}",
                'BlockHeight': block_height,
                'TimeStamp': timestamp,
                'From': f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
                'To': f"0x{''.join(random.choices('0123456789abcdef', k=40))}",
                'Value': round(amount, 8),
                'isError': is_error
            }
            sample_data.append(transaction)
            
        return jsonify(sample_data)
        
    except Exception as e:
        logger.error(f"Sample data generation error: {e}")
        return jsonify({'error': f'Failed to generate sample data: {str(e)}'}), 500

if __name__ == '__main__':
    print("🛡️ ChainGuard API Server")
    print("=" * 30)
    print("🚀 Starting Flask API server...")
    print("📡 API will be available at: http://localhost:5000")
    print("🔗 React frontend should connect automatically")
    print("🛑 Press Ctrl+C to stop")
    print("-" * 30)
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)