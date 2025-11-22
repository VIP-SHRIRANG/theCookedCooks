#!/usr/bin/env python3
"""
ChainGuard Real-Time Blockchain Fraud Monitoring System
Next-generation fraud detection for Polygon Mainnet with advanced ML capabilities

This production system:
1. Implements sophisticated feature engineering optimized for real-time inference
2. Loads enterprise-grade trained fraud detection model
3. Maintains live WebSocket connection to Polygon Mainnet
4. Processes streaming transactions with sub-second latency
5. Applies advanced ML pipeline for instant fraud detection
6. Provides comprehensive real-time monitoring and alerting
"""

import pandas as pd
import numpy as np
import pickle
import joblib
import time
import json
import asyncio
import threading
from datetime import datetime, timedelta
from collections import deque
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from web3.exceptions import ConnectionError as Web3ConnectionError
import warnings
warnings.filterwarnings('ignore')

# Configuration
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

ALCHEMY_API_KEY = os.getenv('ALCHEMY_API_KEY')
if not ALCHEMY_API_KEY:
    raise ValueError("ALCHEMY_API_KEY environment variable is required")

ALCHEMY_WSS_URL = f"wss://polygon-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
ALCHEMY_HTTP_URL = f"https://polygon-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}"
FRAUD_THRESHOLD = 0.5
HIGH_RISK_THRESHOLD = 0.8
MAX_HISTORY = 1000
DISPLAY_INTERVAL = 10  # seconds

class FraudMonitor:
    def __init__(self):
        """Initialize the fraud monitoring system"""
        print("🛡️ Initializing ChainGuard Real-Time Fraud Monitor...")
        
        # Load model and feature columns
        self.model, self.feature_columns = self.load_model_and_columns()
        
        # Initialize data storage
        self.transaction_history = deque(maxlen=MAX_HISTORY)
        self.fraud_history = deque(maxlen=MAX_HISTORY)
        self.high_risk_transactions = deque(maxlen=100)
        
        # Initialize metrics
        self.total_processed = 0
        self.total_fraud = 0
        self.total_high_risk = 0
        self.start_time = datetime.now()
        
        # Initialize Web3 connection
        self.w3 = None
        self.connect_websocket()
        
        print("✅ ChainGuard initialized successfully!")
    
    def load_model_and_columns(self):
        """Load the trained model and feature columns"""
        try:
            print("📦 Loading trained model...")
            model = joblib.load('best_model.pkl')
            
            print("Loading feature columns...")
            with open('X_final_columns.pkl', 'rb') as f:
                feature_columns = pickle.load(f)
            
            print(f"Model loaded: {type(model).__name__}")
            print(f"Features loaded: {len(feature_columns)} columns")
            return model, feature_columns
            
        except Exception as e:
            print(f"Error loading model: {e}")
            return None, None
    
    def connect_websocket(self):
        """Connect to Polygon Mainnet via WebSocket or HTTP"""
        try:
            print("🔌 Connecting to Polygon Mainnet...")
            
            # Try WebSocket first
            try:
                self.w3 = Web3(Web3.LegacyWebSocketProvider(ALCHEMY_WSS_URL))
                self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if self.w3.is_connected():
                    print("✅ Connected via WebSocket")
                    print(f"📊 Latest block: {self.w3.eth.block_number}")
                    return True
            except Exception as ws_error:
                print(f"⚠️ WebSocket failed: {ws_error}")
            
            # Fallback to HTTP with public endpoint
            try:
                print("🔄 Trying HTTP connection...")
                self.w3 = Web3(Web3.HTTPProvider("https://polygon-rpc.com"))
                self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if self.w3.is_connected():
                    print("✅ Connected via HTTP (limited real-time capabilities)")
                    print(f"📊 Latest block: {self.w3.eth.block_number}")
                    return True
            except Exception as http_error:
                print(f"❌ HTTP connection failed: {http_error}")
            
            print("❌ All connection methods failed")
            return False
                
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def engineer_features(self, raw_df):
        """
        ChainGuard Real-Time Feature Engineering
        
        Applies production-grade feature transformations optimized for real-time inference:
        - Efficient value transformations
        - Address behavior analysis  
        - Temporal pattern detection
        - Fraud indicator extraction
        """
        df = raw_df.copy()
        
        # Preprocessing
        df['To'] = df['To'].fillna('unknown_address')
        df['TimeStamp_dt'] = pd.to_datetime(df['TimeStamp'], unit='s')
        
        # Core value features
        df['Value_log1p'] = np.log1p(df['Value'])
        
        # Sender behavior analysis
        from_stats = df.groupby('From').agg(
            from_tx_count=('TxHash', 'count'),
            from_avg_value=('Value', 'mean'), 
            from_total_value=('Value', 'sum'),
            from_unique_recipients=('To', 'nunique')
        ).reset_index()
        df = pd.merge(df, from_stats, on='From', how='left')
        
        # Receiver behavior analysis
        to_stats = df.groupby('To').agg(
            to_tx_count=('TxHash', 'count'),
            to_avg_value=('Value', 'mean'),
            to_total_value=('Value', 'sum'), 
            to_unique_senders=('From', 'nunique')
        ).reset_index()
        df = pd.merge(df, to_stats, on='To', how='left')
        
        # Temporal fraud indicators
        df = df.sort_values(['From', 'TimeStamp_dt'])
        df['time_since_last_tx_from'] = (
            df.groupby('From')['TimeStamp_dt'].diff().dt.total_seconds().fillna(0)
        )
        
        df = df.sort_values(['To', 'TimeStamp_dt'])
        df['time_since_last_tx_to'] = (
            df.groupby('To')['TimeStamp_dt'].diff().dt.total_seconds().fillna(0)
        )
        
        # Address rarity encoding
        df['From_Frequency'] = df['From'].map(df['From'].value_counts())
        df['To_Frequency'] = df['To'].map(df['To'].value_counts())
        
        return df
    
    def predict_fraud(self, tx_data):
        """
        Predict fraud probability for a single transaction
        """
        try:
            # Create DataFrame from transaction data
            df_raw = pd.DataFrame([tx_data])
            
            # Apply feature engineering
            df_engineered = self.engineer_features(df_raw)
            
            # Select and reorder columns to match training
            X = df_engineered[self.feature_columns].copy()
            
            # Handle any missing values with median imputation
            for col in X.columns:
                if X[col].isnull().any():
                    X[col].fillna(X[col].median() if not X[col].empty else 0, inplace=True)
            
            # Get fraud probability
            fraud_prob = self.model.predict_proba(X)[0][1]
            prediction = int(fraud_prob >= FRAUD_THRESHOLD)
            
            return fraud_prob, prediction
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return 0.0, 0
    
    def process_transaction(self, tx_hash):
        """
        Process a single transaction and predict fraud
        """
        try:
            # Get transaction details
            tx = self.w3.eth.get_transaction(tx_hash)
            
            # Extract transaction data
            tx_data = {
                'TxHash': tx_hash.hex(),
                'BlockHeight': tx.get('blockNumber', 0) or 0,
                'TimeStamp': int(time.time()),  # Current timestamp for pending tx
                'From': tx['from'],
                'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                'Value': int(tx['value'])
            }
            
            # Predict fraud
            fraud_prob, prediction = self.predict_fraud(tx_data)
            
            # Update metrics
            self.total_processed += 1
            if prediction == 1:
                self.total_fraud += 1
            if fraud_prob >= HIGH_RISK_THRESHOLD:
                self.total_high_risk += 1
            
            # Store transaction data
            tx_result = {
                **tx_data,
                'fraud_probability': fraud_prob,
                'prediction': prediction,
                'timestamp': datetime.now()
            }
            
            self.transaction_history.append(tx_result)
            self.fraud_history.append(fraud_prob)
            
            # Store high-risk transactions
            if fraud_prob >= HIGH_RISK_THRESHOLD:
                self.high_risk_transactions.append(tx_result)
            
            # Display alert for high-risk transactions
            if fraud_prob >= HIGH_RISK_THRESHOLD:
                self.display_fraud_alert(tx_result)
            
            return tx_result
            
        except Exception as e:
            print(f"❌ Error processing transaction {tx_hash}: {e}")
            return None
    
    def display_fraud_alert(self, tx_result):
        """Display fraud alert for high-risk transactions"""
        print("\n" + "="*80)
        print("🚨 HIGH RISK TRANSACTION DETECTED!")
        print("="*80)
        print(f"📋 Hash: {tx_result['TxHash']}")
        print(f"📊 Fraud Probability: {tx_result['fraud_probability']:.4f}")
        print(f"🏷️  Prediction: {'FRAUDULENT' if tx_result['prediction'] == 1 else 'SUSPICIOUS'}")
        print(f"💰 Value: {tx_result['Value'] / 1e18:.6f} MATIC")
        print(f"📤 From: {tx_result['From']}")
        print(f"📥 To: {tx_result['To']}")
        print(f"⏰ Time: {tx_result['timestamp'].strftime('%H:%M:%S')}")
        print("="*80)
    
    def display_dashboard(self):
        """Display real-time monitoring dashboard"""
        while True:
            try:
                # Clear screen (works on most terminals)
                print("\033[2J\033[H")
                
                # Header
                print("🛡️ " + "="*78)
                print("   ChainGuard Real-Time Fraud Monitoring Dashboard")
                print("="*80)
                
                # Runtime metrics
                runtime = datetime.now() - self.start_time
                fraud_rate = (self.total_fraud / max(self.total_processed, 1)) * 100
                high_risk_rate = (self.total_high_risk / max(self.total_processed, 1)) * 100
                
                print(f"⏱️  Runtime: {str(runtime).split('.')[0]}")
                print(f"📊 Total Processed: {self.total_processed}")
                print(f"🚨 Fraudulent: {self.total_fraud} ({fraud_rate:.2f}%)")
                print(f"⚠️  High Risk: {self.total_high_risk} ({high_risk_rate:.2f}%)")
                print(f"🔗 Connection: {'✅ Connected' if self.w3 and self.w3.is_connected() else '❌ Disconnected'}")
                
                # Recent fraud probabilities
                if len(self.fraud_history) > 0:
                    recent_probs = list(self.fraud_history)[-20:]
                    avg_prob = np.mean(recent_probs)
                    max_prob = np.max(recent_probs)
                    print(f"📈 Avg Fraud Prob (last 20): {avg_prob:.4f}")
                    print(f"📊 Max Fraud Prob (last 20): {max_prob:.4f}")
                
                print("-" * 80)
                
                # High-risk transactions table
                print("🚨 RECENT HIGH-RISK TRANSACTIONS:")
                print("-" * 80)
                
                if len(self.high_risk_transactions) > 0:
                    print(f"{'Time':<8} {'Hash':<20} {'Prob':<6} {'Value (MATIC)':<12} {'From':<20}")
                    print("-" * 80)
                    
                    for tx in list(self.high_risk_transactions)[-10:]:
                        time_str = tx['timestamp'].strftime('%H:%M:%S')
                        hash_short = tx['TxHash'][:18] + "..."
                        prob_str = f"{tx['fraud_probability']:.3f}"
                        value_str = f"{tx['Value'] / 1e18:.4f}"
                        from_short = tx['From'][:18] + "..."
                        
                        print(f"{time_str:<8} {hash_short:<20} {prob_str:<6} {value_str:<12} {from_short:<20}")
                else:
                    print("No high-risk transactions detected yet.")
                
                print("-" * 80)
                
                # Fraud probability histogram
                if len(self.fraud_history) >= 10:
                    print("📊 FRAUD PROBABILITY DISTRIBUTION (last 50 transactions):")
                    recent_probs = list(self.fraud_history)[-50:]
                    
                    # Create simple ASCII histogram
                    bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
                    hist, _ = np.histogram(recent_probs, bins=bins)
                    
                    for i, count in enumerate(hist):
                        bar = "█" * min(count, 50)  # Limit bar length
                        print(f"{bins[i]:.1f}-{bins[i+1]:.1f}: {bar} ({count})")
                
                print("="*80)
                print("Press Ctrl+C to stop monitoring...")
                
                time.sleep(DISPLAY_INTERVAL)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Dashboard error: {e}")
                time.sleep(5)
    
    async def stream_pending_transactions(self):
        """Stream pending transactions from Polygon Mainnet"""
        print("🔄 Starting pending transaction stream...")
        
        try:
            # Subscribe to pending transactions
            pending_filter = self.w3.eth.filter('pending')
            
            while True:
                try:
                    # Get new pending transactions
                    new_entries = pending_filter.get_new_entries()
                    
                    for tx_hash in new_entries:
                        try:
                            # Process transaction in background
                            threading.Thread(
                                target=self.process_transaction, 
                                args=(tx_hash,),
                                daemon=True
                            ).start()
                            
                        except Exception as e:
                            print(f"❌ Error processing pending tx: {e}")
                    
                    # Small delay to prevent overwhelming the system
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    print(f"❌ Pending stream error: {e}")
                    await asyncio.sleep(5)
                    
        except Exception as e:
            print(f"❌ Failed to start pending stream: {e}")
    
    async def stream_new_blocks(self):
        """Stream new blocks and process their transactions"""
        print("🔄 Starting new block stream...")
        
        try:
            # Subscribe to new blocks
            block_filter = self.w3.eth.filter('latest')
            
            while True:
                try:
                    # Get new blocks
                    new_blocks = block_filter.get_new_entries()
                    
                    for block_hash in new_blocks:
                        try:
                            # Get block details
                            block = self.w3.eth.get_block(block_hash, full_transactions=True)
                            
                            print(f"📦 Processing block {block['number']} with {len(block['transactions'])} transactions")
                            
                            # Process a sample of transactions (to avoid overwhelming)
                            sample_size = min(10, len(block['transactions']))
                            sample_txs = block['transactions'][:sample_size]
                            
                            for tx in sample_txs:
                                try:
                                    # Extract transaction data
                                    tx_data = {
                                        'TxHash': tx['hash'].hex(),
                                        'BlockHeight': block['number'],
                                        'TimeStamp': block['timestamp'],
                                        'From': tx['from'],
                                        'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                                        'Value': int(tx['value'])
                                    }
                                    
                                    # Process in background
                                    threading.Thread(
                                        target=lambda: self.predict_fraud(tx_data),
                                        daemon=True
                                    ).start()
                                    
                                except Exception as e:
                                    print(f"❌ Error processing block tx: {e}")
                        
                        except Exception as e:
                            print(f"❌ Error processing block: {e}")
                    
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    print(f"❌ Block stream error: {e}")
                    await asyncio.sleep(5)
                    
        except Exception as e:
            print(f"❌ Failed to start block stream: {e}")
    
    def run_monitoring(self, mode='pending'):
        """
        Run the real-time monitoring system
        
        Args:
            mode: 'pending' for pending transactions, 'blocks' for new blocks
        """
        if not self.model or not self.feature_columns:
            print("❌ Cannot start monitoring: Model or features not loaded")
            return
        
        if not self.w3 or not self.w3.is_connected():
            print("❌ Cannot start monitoring: Not connected to blockchain")
            return
        
        print(f"🚀 Starting real-time fraud monitoring in {mode} mode...")
        
        # Start dashboard in separate thread
        dashboard_thread = threading.Thread(target=self.display_dashboard, daemon=True)
        dashboard_thread.start()
        
        # Start streaming
        try:
            if mode == 'pending':
                asyncio.run(self.stream_pending_transactions())
            elif mode == 'blocks':
                asyncio.run(self.stream_new_blocks())
            else:
                print("❌ Invalid mode. Use 'pending' or 'blocks'")
                
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")
        except Exception as e:
            print(f"❌ Monitoring error: {e}")


def main():
    """Main function to run the fraud monitoring system"""
    print("🛡️ ChainGuard Real-Time Blockchain Fraud Monitoring System")
    print("=" * 80)
    
    # Initialize monitor
    monitor = FraudMonitor()
    
    if not monitor.model:
        print("❌ Failed to initialize fraud monitor")
        return
    
    # Choose monitoring mode
    print("\nSelect monitoring mode:")
    print("1. Pending transactions (real-time, high volume)")
    print("2. New blocks (confirmed transactions, lower volume)")
    
    try:
        choice = input("\nEnter choice (1 or 2): ").strip()
        
        if choice == '1':
            monitor.run_monitoring('pending')
        elif choice == '2':
            monitor.run_monitoring('blocks')
        else:
            print("❌ Invalid choice. Starting pending transaction monitoring...")
            monitor.run_monitoring('pending')
            
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main()