#!/usr/bin/env python3
"""
ChainGuard API Server
Flask backend for React frontend
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
transaction_queue = queue.Queue()
processed_tx_hashes = set()  # Track processed transactions to avoid duplicates

# Load ML model
model, feature_columns = backend.load_model_and_columns()

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
                        
                        # Process sample of transactions
                        sample_size = min(3, len(block['transactions']))
                        
                        for tx in block['transactions'][:sample_size]:
                            if not monitoring_state['active']:
                                break
                            
                            # Create transaction data
                            tx_data = {
                                'TxHash': tx['hash'].hex(),
                                'BlockHeight': block_num,
                                'TimeStamp': block['timestamp'],
                                'From': tx['from'],
                                'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                                'Value': int(tx['value'])
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
        
        return jsonify({
            'isActive': monitoring_state['active'],
            'isConnected': monitoring_state['connected'],
            'totalProcessed': monitoring_state['total_processed'],
            'totalFraud': monitoring_state['total_fraud'],
            'fraudRate': round(fraud_rate, 2),
            'highRiskCount': high_risk_count,
            'currentBlock': monitoring_state['current_block'],
            'lastUpdate': monitoring_state['last_update'],
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'monitoring_active': monitoring_state['active'],
        'blockchain_connected': monitoring_state['connected'],
    })

if __name__ == '__main__':
    print("🛡️ ChainGuard API Server")
    print("=" * 30)
    print("🚀 Starting Flask API server...")
    print("📡 API will be available at: http://localhost:5000")
    print("🔗 React frontend should connect automatically")
    print("🛑 Press Ctrl+C to stop")
    print("-" * 30)
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)