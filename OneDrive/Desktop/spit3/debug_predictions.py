#!/usr/bin/env python3
"""
Debug ChainGuard ML Predictions
"""
import pandas as pd
import backend
import numpy as np

def test_predictions():
    """Test the ML prediction pipeline with sample data"""
    print("🔍 Debugging ChainGuard ML Predictions")
    print("=" * 50)
    
    # Load model
    model, columns = backend.load_model_and_columns()
    if not model or not columns:
        print("❌ Failed to load model")
        return
    
    print(f"✅ Model loaded: {type(model).__name__}")
    print(f"✅ Features: {len(columns)} columns")
    
    # Create test transactions with different patterns
    test_transactions = [
        {
            'TxHash': '0x1234567890abcdef1234567890abcdef12345678901234567890abcdef12345678',
            'BlockHeight': 18500000,
            'TimeStamp': 1699000000,
            'From': '0x1234567890abcdef1234567890abcdef12345678',
            'To': '0xabcdef1234567890abcdef1234567890abcdef12',
            'Value': 1000000000000000000  # 1 ETH
        },
        {
            'TxHash': '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
            'BlockHeight': 18500001,
            'TimeStamp': 1699000060,
            'From': '0xabcdef1234567890abcdef1234567890abcdef12',
            'To': '0x1234567890abcdef1234567890abcdef12345678',
            'Value': 100000000000000000  # 0.1 ETH
        },
        {
            'TxHash': '0x9999999999999999999999999999999999999999999999999999999999999999',
            'BlockHeight': 18500002,
            'TimeStamp': 1699000120,
            'From': '0x9999999999999999999999999999999999999999',
            'To': '0x0000000000000000000000000000000000000000',
            'Value': 10000000000000000000  # 10 ETH - potentially suspicious
        }
    ]
    
    print("\n🧪 Testing predictions on sample transactions:")
    print("-" * 50)
    
    for i, tx in enumerate(test_transactions, 1):
        print(f"\nTransaction {i}:")
        print(f"  Value: {float(tx['Value']) / 1e18:.4f} ETH")
        print(f"  From: {tx['From'][:10]}...{tx['From'][-8:]}")
        print(f"  To: {tx['To'][:10]}...{tx['To'][-8:]}")
        
        try:
            # Process through ML pipeline
            df_result = backend.predict_with_risk(pd.DataFrame([tx]))
            
            fraud_prob = df_result['p_fraud'].iloc[0]
            risk_score = df_result['risk_score'].iloc[0]
            label = df_result['label'].iloc[0]
            action = df_result['action'].iloc[0]
            
            print(f"  📊 Fraud Probability: {fraud_prob:.4f}")
            print(f"  🎯 Risk Score: {risk_score}%")
            print(f"  🏷️ Label: {label}")
            print(f"  ⚡ Action: {action}")
            
            # Check if results make sense
            if risk_score >= 50 and label == 'Normal':
                print(f"  ⚠️ WARNING: High risk score ({risk_score}%) but labeled as Normal!")
            elif risk_score < 50 and label == 'Fraudulent':
                print(f"  ⚠️ WARNING: Low risk score ({risk_score}%) but labeled as Fraudulent!")
            else:
                print(f"  ✅ Prediction looks consistent")
                
        except Exception as e:
            print(f"  ❌ Error processing transaction: {e}")
    
    # Test with edge cases
    print(f"\n🔬 Testing edge cases:")
    print("-" * 50)
    
    edge_cases = [
        {
            'name': 'Zero value transaction',
            'tx': {
                'TxHash': '0x0000000000000000000000000000000000000000000000000000000000000000',
                'BlockHeight': 18500003,
                'TimeStamp': 1699000180,
                'From': '0x1111111111111111111111111111111111111111',
                'To': '0x2222222222222222222222222222222222222222',
                'Value': 0
            }
        },
        {
            'name': 'Very high value transaction',
            'tx': {
                'TxHash': '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                'BlockHeight': 18500004,
                'TimeStamp': 1699000240,
                'From': '0xffffffffffffffffffffffffffffffffffffffff',
                'To': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                'Value': 1000000000000000000000  # 1000 ETH
            }
        }
    ]
    
    for case in edge_cases:
        print(f"\n{case['name']}:")
        try:
            df_result = backend.predict_with_risk(pd.DataFrame([case['tx']]))
            risk_score = df_result['risk_score'].iloc[0]
            label = df_result['label'].iloc[0]
            print(f"  Risk Score: {risk_score}%, Label: {label}")
        except Exception as e:
            print(f"  Error: {e}")
    
    print(f"\n🎉 Prediction testing complete!")

if __name__ == "__main__":
    test_predictions()