"""
ChainGuard DeFi Fraud Monitoring Dashboard
Production-grade real-time fraud detection system for Polygon Mainnet
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import backend
import asyncio
import threading
import time
import json
from datetime import datetime, timedelta
from collections import deque
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
import queue
from typing import Dict, List

# Page configuration
st.set_page_config(
    page_title="ChainGuard - Real-Time Fraud Monitor",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Configuration
ALCHEMY_WSS_URL = "wss://polygon-mainnet.g.alchemy.com/v2/X7rMBFUvYXKpnm9Or6iEfUsing"
ALCHEMY_HTTP_URL = "https://polygon-mainnet.g.alchemy.com/v2/X7rMBFUvYXKpnm9Or6iEfUsing"
FRAUD_THRESHOLD = 0.5
HIGH_RISK_THRESHOLD = 0.8

# Initialize session state for real-time data
if 'transaction_queue' not in st.session_state:
    st.session_state.transaction_queue = queue.Queue()
if 'live_transactions' not in st.session_state:
    st.session_state.live_transactions = deque(maxlen=1000)
if 'fraud_history' not in st.session_state:
    st.session_state.fraud_history = deque(maxlen=1000)
if 'high_risk_transactions' not in st.session_state:
    st.session_state.high_risk_transactions = deque(maxlen=100)
if 'monitoring_active' not in st.session_state:
    st.session_state.monitoring_active = False
if 'w3_connection' not in st.session_state:
    st.session_state.w3_connection = None
if 'total_processed' not in st.session_state:
    st.session_state.total_processed = 0
if 'total_fraud' not in st.session_state:
    st.session_state.total_fraud = 0
if 'start_time' not in st.session_state:
    st.session_state.start_time = datetime.now()
if 'last_processed_block' not in st.session_state:
    st.session_state.last_processed_block = 0

# Custom CSS
st.markdown("""
<style>
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #ff6b6b;
    }
    .high-risk { border-left-color: #ff6b6b; }
    .medium-risk { border-left-color: #ffa726; }
    .low-risk { border-left-color: #66bb6a; }
</style>
""", unsafe_allow_html=True)


class RealTimeMonitor:
    """Real-time blockchain monitoring class"""
    
    def __init__(self):
        self.w3 = None
        self.model, self.feature_columns = backend.load_model_and_columns()
        
    def connect_websocket(self):
        """Connect to Polygon Mainnet"""
        try:
            # Try WebSocket first
            try:
                self.w3 = Web3(Web3.LegacyWebSocketProvider(ALCHEMY_WSS_URL))
                self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if self.w3.is_connected():
                    return True
            except Exception as ws_error:
                st.warning(f"WebSocket connection failed: {ws_error}")
            
            # Fallback to HTTP provider with public endpoint
            try:
                self.w3 = Web3(Web3.HTTPProvider("https://polygon-rpc.com"))
                self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if self.w3.is_connected():
                    st.info("Connected via HTTP provider (WebSocket unavailable)")
                    return True
            except Exception as http_error:
                st.error(f"HTTP connection failed: {http_error}")
            
            return False
            
        except Exception as e:
            st.error(f"Connection error: {e}")
            return False
    
    def process_transaction(self, tx_hash):
        """Process a single transaction"""
        try:
            tx = self.w3.eth.get_transaction(tx_hash)
            
            tx_data = {
                'TxHash': tx_hash.hex(),
                'BlockHeight': tx.get('blockNumber', 0) or 0,
                'TimeStamp': int(time.time()),
                'From': tx['from'],
                'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                'Value': int(tx['value'])
            }
            
            # Predict fraud
            df_result = backend.predict_with_risk(pd.DataFrame([tx_data]))
            
            result = {
                **tx_data,
                'fraud_probability': df_result['p_fraud'].iloc[0],
                'risk_score': df_result['risk_score'].iloc[0],
                'label': df_result['label'].iloc[0],
                'action': df_result['action'].iloc[0],
                'timestamp': datetime.now()
            }
            
            # Add to session state
            st.session_state.live_transactions.append(result)
            st.session_state.fraud_history.append(result['fraud_probability'])
            st.session_state.total_processed += 1
            
            if result['label'] == 'Fraudulent':
                st.session_state.total_fraud += 1
            
            if result['risk_score'] >= 80:
                st.session_state.high_risk_transactions.append(result)
            
            return result
            
        except Exception as e:
            return None
    
    def start_monitoring(self):
        """Start real-time monitoring"""
        if not self.connect_websocket():
            return False
        
        st.session_state.w3_connection = self.w3
        st.session_state.monitoring_active = True
        st.session_state.last_processed_block = 0
        
        return True
    
    def process_live_transactions(self):
        """Process transactions from recent blocks (called from main thread)"""
        if not st.session_state.monitoring_active or not st.session_state.w3_connection:
            return
        
        try:
            w3 = st.session_state.w3_connection
            current_block = w3.eth.block_number
            
            # Process blocks we haven't seen yet
            if current_block > st.session_state.last_processed_block:
                # Process up to 3 recent blocks to catch up
                start_block = max(st.session_state.last_processed_block + 1, current_block - 2)
                
                for block_num in range(start_block, current_block + 1):
                    try:
                        block = w3.eth.get_block(block_num, full_transactions=True)
                        
                        # Process a sample of transactions (limit for performance)
                        sample_size = min(3, len(block['transactions']))
                        
                        for tx in block['transactions'][:sample_size]:
                            # Create transaction data
                            tx_data = {
                                'TxHash': tx['hash'].hex(),
                                'BlockHeight': block_num,
                                'TimeStamp': block['timestamp'],
                                'From': tx['from'],
                                'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                                'Value': int(tx['value'])
                            }
                            
                            # Process transaction immediately
                            result = self.process_transaction_data(tx_data)
                            # No need for queue - process directly
                    
                    except Exception as block_error:
                        continue  # Skip problematic blocks
                
                st.session_state.last_processed_block = current_block
        
        except Exception as e:
            pass  # Silently handle errors to avoid UI disruption
    
    def process_transaction_data(self, tx_data):
        """Process transaction data directly (without fetching from blockchain)"""
        try:
            # Predict fraud
            df_result = backend.predict_with_risk(pd.DataFrame([tx_data]))
            
            result = {
                **tx_data,
                'fraud_probability': df_result['p_fraud'].iloc[0],
                'risk_score': df_result['risk_score'].iloc[0],
                'label': df_result['label'].iloc[0],
                'action': df_result['action'].iloc[0],
                'timestamp': datetime.now()
            }
            
            # Add to session state
            st.session_state.live_transactions.append(result)
            st.session_state.fraud_history.append(result['fraud_probability'])
            st.session_state.total_processed += 1
            
            if result['label'] == 'Fraudulent':
                st.session_state.total_fraud += 1
            
            if result['risk_score'] >= 80:
                st.session_state.high_risk_transactions.append(result)
            
            return result
            
        except Exception as e:
            return None


def main():
    # Sidebar
    st.sidebar.title("🛡️ ChainGuard")
    st.sidebar.markdown("**Real-Time DeFi Fraud Detection**")
    st.sidebar.markdown("---")
    
    # Real-time monitoring controls
    st.sidebar.subheader("🔴 Live Monitoring")
    
    monitor = RealTimeMonitor()
    
    if not st.session_state.monitoring_active:
        if st.sidebar.button("🚀 Start Real-Time Monitoring", type="primary"):
            with st.sidebar:
                with st.spinner("Connecting to Polygon Mainnet..."):
                    if monitor.start_monitoring():
                        st.success("✅ Monitoring started!")
                        st.rerun()
                    else:
                        st.error("❌ Failed to start monitoring")
    else:
        if st.sidebar.button("🛑 Stop Monitoring", type="secondary"):
            st.session_state.monitoring_active = False
            st.success("Monitoring stopped")
            st.rerun()
        
        # Live status
        st.sidebar.success("🟢 Live Monitoring Active")
        st.sidebar.metric("Transactions Processed", st.session_state.total_processed)
        st.sidebar.metric("Fraudulent Detected", st.session_state.total_fraud)
    
    st.sidebar.markdown("---")
    
    # Mode selector
    mode = st.sidebar.selectbox(
        "Select Mode",
        ["Real-Time Dashboard", "Score CSV of transactions", "Manual single transaction input"]
    )
    
    # Privacy toggle
    privacy_mode = st.sidebar.checkbox("Enable privacy mode (hash sender/receiver)")
    
    # Risk threshold
    risk_threshold = st.sidebar.slider("High-risk threshold", 50, 95, 80)
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("**About ChainGuard**")
    st.sidebar.markdown("Production-grade ML fraud detection for Polygon Mainnet using real-time transaction analysis.")
    
    # Main content based on mode
    if mode == "Real-Time Dashboard":
        show_realtime_dashboard(privacy_mode, risk_threshold)
    elif mode == "Score CSV of transactions":
        show_csv_scoring(privacy_mode, risk_threshold)
    else:
        show_manual_input(privacy_mode, risk_threshold)


def show_realtime_dashboard(privacy_mode: bool, risk_threshold: int):
    st.title("🛡️ ChainGuard Real-Time Dashboard")
    
    # Process live transactions if monitoring is active
    if st.session_state.monitoring_active:
        monitor = RealTimeMonitor()
        monitor.process_live_transactions()
        time.sleep(0.1)  # Small delay to allow data processing
        st.rerun()
    
    # Real-time metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    
    runtime = datetime.now() - st.session_state.start_time
    fraud_rate = (st.session_state.total_fraud / max(st.session_state.total_processed, 1)) * 100
    high_risk_count = len([tx for tx in st.session_state.live_transactions if tx.get('risk_score', 0) >= risk_threshold])
    
    with col1:
        st.metric("🔴 Live Status", "Active" if st.session_state.monitoring_active else "Inactive")
    with col2:
        st.metric("📊 Total Processed", st.session_state.total_processed)
    with col3:
        st.metric("🚨 Fraudulent", st.session_state.total_fraud, f"{fraud_rate:.1f}%")
    with col4:
        st.metric("⚠️ High Risk", high_risk_count)
    with col5:
        st.metric("⏱️ Runtime", str(runtime).split('.')[0])
    
    # Connection status
    if st.session_state.w3_connection:
        try:
            latest_block = st.session_state.w3_connection.eth.block_number
            st.success(f"🔗 Connected to Polygon Mainnet - Latest Block: {latest_block}")
        except:
            st.error("🔗 Connection Lost")
    else:
        st.info("🔗 Not connected to blockchain")
    
    # Real-time charts and data
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📈 Live Fraud Probability Stream")
        
        if len(st.session_state.fraud_history) > 0:
            # Create time series of fraud probabilities
            recent_probs = list(st.session_state.fraud_history)[-50:]
            timestamps = [datetime.now() - timedelta(seconds=i) for i in range(len(recent_probs)-1, -1, -1)]
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=timestamps,
                y=recent_probs,
                mode='lines+markers',
                name='Fraud Probability',
                line=dict(color='red', width=2)
            ))
            
            fig.add_hline(y=FRAUD_THRESHOLD, line_dash="dash", line_color="orange", 
                         annotation_text="Fraud Threshold")
            fig.add_hline(y=HIGH_RISK_THRESHOLD, line_dash="dash", line_color="red", 
                         annotation_text="High Risk Threshold")
            
            fig.update_layout(
                title="Real-Time Fraud Probability",
                xaxis_title="Time",
                yaxis_title="Fraud Probability",
                height=400
            )
            
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No live data yet. Start monitoring to see real-time fraud probabilities.")
    
    with col2:
        st.subheader("📊 Risk Score Distribution")
        
        if len(st.session_state.live_transactions) > 0:
            risk_scores = [tx.get('risk_score', 0) for tx in st.session_state.live_transactions]
            
            fig = px.histogram(
                x=risk_scores, 
                nbins=20,
                title="Live Risk Score Distribution",
                labels={'x': 'Risk Score', 'y': 'Count'}
            )
            fig.add_vline(x=risk_threshold, line_dash="dash", line_color="red")
            fig.update_layout(height=400)
            
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No transactions processed yet.")
    
    # Live transaction feed
    st.subheader("🔴 Live Transaction Feed")
    
    if len(st.session_state.live_transactions) > 0:
        # Get recent transactions
        recent_txs = list(st.session_state.live_transactions)[-20:]
        
        # Create DataFrame for display
        display_data = []
        for tx in reversed(recent_txs):  # Show newest first
            display_data.append({
                'Time': tx['timestamp'].strftime('%H:%M:%S'),
                'Hash': tx['TxHash'][:20] + "..." if len(tx['TxHash']) > 20 else tx['TxHash'],
                'From': backend.hash_identifier(tx['From']) if privacy_mode else tx['From'][:20] + "...",
                'To': backend.hash_identifier(tx['To']) if privacy_mode else tx['To'][:20] + "...",
                'Value (MATIC)': f"{tx['Value'] / 1e18:.6f}",
                'Risk Score': tx['risk_score'],
                'Label': tx['label'],
                'Action': tx['action']
            })
        
        df_display = pd.DataFrame(display_data)
        
        # Color code based on risk
        def highlight_risk(row):
            if row['Risk Score'] >= 80:
                return ['background-color: #ffebee'] * len(row)
            elif row['Risk Score'] >= 50:
                return ['background-color: #fff3e0'] * len(row)
            else:
                return ['background-color: #e8f5e8'] * len(row)
        
        styled_df = df_display.style.apply(highlight_risk, axis=1)
        st.dataframe(styled_df, use_container_width=True, height=400)
        
    else:
        st.info("No live transactions yet. Start monitoring to see real-time transaction feed.")
    
    # High-risk alerts
    st.subheader("🚨 High-Risk Transaction Alerts")
    
    if len(st.session_state.high_risk_transactions) > 0:
        high_risk_data = []
        for tx in list(st.session_state.high_risk_transactions)[-10:]:
            high_risk_data.append({
                'Time': tx['timestamp'].strftime('%H:%M:%S'),
                'Hash': tx['TxHash'],
                'Risk Score': tx['risk_score'],
                'Fraud Probability': f"{tx['fraud_probability']:.4f}",
                'Value (MATIC)': f"{tx['Value'] / 1e18:.6f}",
                'From': backend.hash_identifier(tx['From']) if privacy_mode else tx['From'],
                'To': backend.hash_identifier(tx['To']) if privacy_mode else tx['To'],
                'Action': tx['action']
            })
        
        df_alerts = pd.DataFrame(high_risk_data)
        st.dataframe(df_alerts, use_container_width=True)
        
        # Alert sound/notification could be added here
        if len(st.session_state.high_risk_transactions) > 0:
            latest_alert = list(st.session_state.high_risk_transactions)[-1]
            if (datetime.now() - latest_alert['timestamp']).seconds < 10:
                st.error(f"🚨 NEW HIGH-RISK TRANSACTION: {latest_alert['TxHash'][:20]}... (Risk: {latest_alert['risk_score']})")
    else:
        st.success("✅ No high-risk transactions detected")
    
    # Performance metrics
    with st.expander("📊 Performance Metrics"):
        col1, col2, col3 = st.columns(3)
        
        if len(st.session_state.fraud_history) > 0:
            avg_fraud_prob = np.mean(list(st.session_state.fraud_history))
            max_fraud_prob = np.max(list(st.session_state.fraud_history))
            
            with col1:
                st.metric("Average Fraud Probability", f"{avg_fraud_prob:.4f}")
            with col2:
                st.metric("Max Fraud Probability", f"{max_fraud_prob:.4f}")
            with col3:
                processing_rate = st.session_state.total_processed / max(runtime.total_seconds() / 60, 1)
                st.metric("Processing Rate", f"{processing_rate:.1f} tx/min")
    
    # Auto-refresh indicator
    if st.session_state.monitoring_active:
        st.info("🔄 Dashboard auto-refreshing every 5 seconds...")
    
    # Manual refresh button
    if st.button("🔄 Refresh Dashboard"):
        st.rerun()


def show_csv_scoring(privacy_mode: bool, risk_threshold: int):
    st.title("📁 Batch Transaction Analysis")
    
    st.markdown("""
    Upload a CSV file containing transaction data for batch fraud analysis. 
    The system will process all transactions using the same ML model used for real-time monitoring.
    """)
    
    # File upload with drag and drop
    uploaded_file = st.file_uploader(
        "Upload CSV file with transactions", 
        type=['csv'],
        help="CSV should contain: TxHash, BlockHeight, TimeStamp, From, To, Value"
    )
    
    # Sample CSV download
    col1, col2 = st.columns(2)
    with col1:
        if st.button("📥 Download Sample CSV Format"):
            sample_data = {
                'TxHash': ['0x1234...', '0x5678...', '0x9abc...'],
                'BlockHeight': [18500000, 18500001, 18500002],
                'TimeStamp': [1699000000, 1699000060, 1699000120],
                'From': ['0x1234567890abcdef...', '0x2345678901abcdef...', '0x3456789012abcdef...'],
                'To': ['0xabcdef1234567890...', '0xbcdef1234567890a...', '0xcdef1234567890ab...'],
                'Value': [1000000000000000000, 500000000000000000, 2000000000000000000]
            }
            sample_df = pd.DataFrame(sample_data)
            csv = sample_df.to_csv(index=False)
            st.download_button(
                label="Download Sample",
                data=csv,
                file_name="sample_transactions.csv",
                mime="text/csv"
            )
    
    if uploaded_file is not None:
        try:
            # Read the uploaded file
            df_raw = pd.read_csv(uploaded_file)
            st.success(f"Loaded {len(df_raw):,} transactions")
            
            # Validate required columns
            required_cols = ['TxHash', 'BlockHeight', 'TimeStamp', 'From', 'To', 'Value']
            missing_cols = [col for col in required_cols if col not in df_raw.columns]
            
            if missing_cols:
                st.error(f"Missing required columns: {missing_cols}")
                st.info("Please ensure your CSV contains all required columns.")
                return
            
            # Show data preview
            with st.expander("📊 Data Preview"):
                col1, col2 = st.columns(2)
                with col1:
                    st.subheader("Raw Data Sample")
                    st.dataframe(df_raw.head(10))
                with col2:
                    st.subheader("Data Statistics")
                    st.write(f"**Total Transactions:** {len(df_raw):,}")
                    st.write(f"**Date Range:** {pd.to_datetime(df_raw['TimeStamp'], unit='s').min()} to {pd.to_datetime(df_raw['TimeStamp'], unit='s').max()}")
                    st.write(f"**Value Range:** {df_raw['Value'].min() / 1e18:.6f} - {df_raw['Value'].max() / 1e18:.6f} MATIC")
                    st.write(f"**Unique Addresses:** {df_raw['From'].nunique() + df_raw['To'].nunique()}")
            
            # Processing options
            st.subheader("Processing Options")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                batch_size = st.selectbox("Batch Size", [100, 500, 1000, 5000], index=1)
            with col2:
                show_progress = st.checkbox("Show Progress", value=True)
            with col3:
                detailed_output = st.checkbox("Include Feature Details", value=False)
            
            # Process button
            if st.button("Process Transactions", type="primary"):
                
                # Process in batches for large files
                total_batches = (len(df_raw) + batch_size - 1) // batch_size
                
                if show_progress:
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                
                all_results = []
                
                for i in range(0, len(df_raw), batch_size):
                    batch_df = df_raw.iloc[i:i+batch_size]
                    
                    if show_progress:
                        batch_num = (i // batch_size) + 1
                        status_text.text(f"Processing batch {batch_num}/{total_batches}...")
                        progress_bar.progress(batch_num / total_batches)
                    
                    try:
                        batch_results = backend.predict_with_risk(batch_df)
                        all_results.append(batch_results)
                    except Exception as e:
                        st.error(f"Error processing batch {batch_num}: {e}")
                        continue
                
                if all_results:
                    df_scored = pd.concat(all_results, ignore_index=True)
                    
                    if show_progress:
                        status_text.text("Processing complete!")
                        progress_bar.progress(1.0)
                    
                    # Apply privacy hashing if enabled
                    if privacy_mode:
                        df_display = backend.apply_privacy_hashing(df_scored, ['From', 'To'])
                        st.info("🔒 Privacy mode enabled - addresses are hashed")
                    else:
                        df_display = df_scored
                    
                    # Results summary
                    st.subheader("Analysis Results")
                    
                    col1, col2, col3, col4, col5 = st.columns(5)
                    
                    total_tx = len(df_scored)
                    high_risk_count = len(df_scored[df_scored['risk_score'] >= risk_threshold])
                    avg_risk = df_scored['risk_score'].mean()
                    fraud_count = len(df_scored[df_scored['label'] == 'Fraudulent'])
                    max_risk = df_scored['risk_score'].max()
                    
                    with col1:
                        st.metric("Total Processed", f"{total_tx:,}")
                    with col2:
                        st.metric("High Risk", f"{high_risk_count:,}", f"{(high_risk_count/total_tx)*100:.1f}%")
                    with col3:
                        st.metric("Fraudulent", f"{fraud_count:,}", f"{(fraud_count/total_tx)*100:.1f}%")
                    with col4:
                        st.metric("Avg Risk Score", f"{avg_risk:.1f}")
                    with col5:
                        st.metric("Max Risk Score", f"{max_risk}")
                    
                    # Visualizations
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Risk distribution
                        fig = px.histogram(df_scored, x='risk_score', nbins=30,
                                         title="Risk Score Distribution",
                                         labels={'x': 'Risk Score', 'y': 'Count'})
                        fig.add_vline(x=risk_threshold, line_dash="dash", line_color="red",
                                     annotation_text=f"High Risk Threshold ({risk_threshold})")
                        st.plotly_chart(fig, use_container_width=True)
                    
                    with col2:
                        # Risk categories
                        high_risk = len(df_scored[df_scored['risk_score'] >= 80])
                        medium_risk = len(df_scored[(df_scored['risk_score'] >= 50) & (df_scored['risk_score'] < 80)])
                        low_risk = len(df_scored[df_scored['risk_score'] < 50])
                        
                        fig = px.pie(values=[low_risk, medium_risk, high_risk],
                                    names=['Low Risk (0-49)', 'Medium Risk (50-79)', 'High Risk (80-100)'],
                                    title="Risk Category Distribution",
                                    color_discrete_map={
                                        'Low Risk (0-49)': '#66bb6a',
                                        'Medium Risk (50-79)': '#ffa726', 
                                        'High Risk (80-100)': '#ff6b6b'
                                    })
                        st.plotly_chart(fig, use_container_width=True)
                    
                    # Top risky transactions
                    st.subheader("🚨 Highest Risk Transactions")
                    top_risky = backend.get_top_risky(df_display, 20)
                    
                    # Enhanced display with more details
                    display_cols = ['TxHash', 'From', 'To', 'Value', 'risk_score', 'p_fraud', 'label', 'action']
                    if detailed_output:
                        display_cols.extend(['BlockHeight', 'TimeStamp'])
                    
                    # Format the display
                    top_risky_display = top_risky[display_cols].copy()
                    top_risky_display['Value'] = top_risky_display['Value'].apply(lambda x: f"{x/1e18:.6f} MATIC")
                    top_risky_display['p_fraud'] = top_risky_display['p_fraud'].apply(lambda x: f"{x:.4f}")
                    
                    # Color coding
                    def highlight_risk(row):
                        risk_score = row['risk_score']
                        if risk_score >= 80:
                            return ['background-color: #ffcdd2'] * len(row)
                        elif risk_score >= 50:
                            return ['background-color: #ffe0b2'] * len(row)
                        else:
                            return [''] * len(row)
                    
                    styled_df = top_risky_display.style.apply(highlight_risk, axis=1)
                    st.dataframe(styled_df, use_container_width=True, height=600)
                    
                    # Download options
                    st.subheader("Download Results")
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        # Full results
                        csv_full = df_display.to_csv(index=False)
                        st.download_button(
                            label="Download Full Results",
                            data=csv_full,
                            file_name=f"chainguard_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv"
                        )
                    
                    with col2:
                        # High-risk only
                        high_risk_df = df_display[df_display['risk_score'] >= risk_threshold]
                        csv_high_risk = high_risk_df.to_csv(index=False)
                        st.download_button(
                            label="Download High-Risk Only",
                            data=csv_high_risk,
                            file_name=f"chainguard_high_risk_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                            mime="text/csv"
                        )
                    
                    with col3:
                        # Summary report
                        summary_report = f"""
ChainGuard Fraud Analysis Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

SUMMARY STATISTICS:
- Total Transactions Analyzed: {total_tx:,}
- High Risk Transactions: {high_risk_count:,} ({(high_risk_count/total_tx)*100:.2f}%)
- Fraudulent Predictions: {fraud_count:,} ({(fraud_count/total_tx)*100:.2f}%)
- Average Risk Score: {avg_risk:.2f}
- Maximum Risk Score: {max_risk}

RISK DISTRIBUTION:
- Low Risk (0-49): {low_risk:,} ({(low_risk/total_tx)*100:.1f}%)
- Medium Risk (50-79): {medium_risk:,} ({(medium_risk/total_tx)*100:.1f}%)
- High Risk (80-100): {high_risk:,} ({(high_risk/total_tx)*100:.1f}%)

TOP 10 HIGHEST RISK TRANSACTIONS:
{top_risky[['TxHash', 'risk_score', 'label']].head(10).to_string(index=False)}
                        """
                        
                        st.download_button(
                            label="Download Summary Report",
                            data=summary_report,
                            file_name=f"chainguard_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                            mime="text/plain"
                        )
                
                else:
                    st.error("Failed to process any transactions")
            
        except Exception as e:
            st.error(f"Error processing file: {str(e)}")
            st.info("Please ensure your CSV has the required columns and proper formatting.")


def show_manual_input(privacy_mode: bool, risk_threshold: int):
    st.title("Single Transaction Analysis")
    
    st.markdown("""
    Analyze individual transactions for fraud risk. Enter transaction details manually 
    or fetch from blockchain using transaction hash.
    """)
    
    # Input method selection
    input_method = st.radio(
        "Input Method",
        ["Manual Entry", "Fetch from Blockchain"],
        horizontal=True
    )
    
    if input_method == "Fetch from Blockchain":
        st.subheader("🔗 Fetch Transaction from Blockchain")
        
        col1, col2 = st.columns([3, 1])
        with col1:
            tx_hash_input = st.text_input(
                "Transaction Hash", 
                placeholder="0x1234567890abcdef...",
                help="Enter a valid Polygon transaction hash"
            )
        with col2:
            fetch_button = st.button("Fetch", type="primary")
        
        if fetch_button and tx_hash_input:
            try:
                # Connect to blockchain and fetch transaction
                # Try WebSocket first, fallback to HTTP
                try:
                    w3 = Web3(Web3.LegacyWebSocketProvider(ALCHEMY_WSS_URL))
                    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                    if not w3.is_connected():
                        w3 = Web3(Web3.HTTPProvider("https://polygon-rpc.com"))
                        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                except:
                    w3 = Web3(Web3.HTTPProvider("https://polygon-rpc.com"))
                    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
                if w3.is_connected():
                    with st.spinner("Fetching transaction from blockchain..."):
                        tx = w3.eth.get_transaction(tx_hash_input)
                        
                        # Populate form with fetched data
                        st.session_state.fetched_tx = {
                            'TxHash': tx_hash_input,
                            'BlockHeight': tx.get('blockNumber', 0) or 0,
                            'TimeStamp': int(time.time()),
                            'From': tx['from'],
                            'To': tx.get('to', '0x0000000000000000000000000000000000000000'),
                            'Value': int(tx['value'])
                        }
                        st.success("Transaction fetched successfully!")
                else:
                    st.error("Could not connect to blockchain")
            except Exception as e:
                st.error(f"Error fetching transaction: {e}")
    
    # Manual input form
    st.subheader("Transaction Details")
    
    with st.form("transaction_form"):
        # Use fetched data if available
        if 'fetched_tx' in st.session_state:
            default_data = st.session_state.fetched_tx
            st.info(" Using data fetched from blockchain")
        else:
            default_data = {
                'TxHash': "0x1234...abcd",
                'BlockHeight': 18500000,
                'TimeStamp': 1699000000,
                'From': "0x1234567890abcdef1234567890abcdef12345678",
                'To': "0xabcdef1234567890abcdef1234567890abcdef12",
                'Value': 1000000000000000000
            }
        
        col1, col2 = st.columns(2)
        
        with col1:
            tx_hash = st.text_input("Transaction Hash", value=default_data['TxHash'])
            block_height = st.number_input("Block Height", value=default_data['BlockHeight'], min_value=0, max_value=99999999)
            timestamp = st.number_input("Timestamp (Unix)", value=default_data['TimeStamp'], min_value=0, max_value=2147483647)
        
        with col2:
            from_addr = st.text_input("From Address", value=default_data['From'])
            to_addr = st.text_input("To Address", value=default_data['To'])
            
            # Value input with MATIC conversion
            col2a, col2b = st.columns(2)
            with col2a:
                value_matic = st.number_input("Value (MATIC)", value=default_data['Value']/1e18, min_value=0.0, format="%.6f")
            with col2b:
                value_wei = st.text_input("Value (Wei)", value=str(int(value_matic * 1e18)))
            
            try:
                value = int(value_wei) if value_wei else int(value_matic * 1e18)
            except ValueError:
                st.error("Please enter a valid number for Value")
                value = 0
        
        # Advanced options
        with st.expander("Advanced Options"):
            col1, col2 = st.columns(2)
            with col1:
                custom_threshold = st.number_input("Custom Risk Threshold", value=risk_threshold, min_value=0, max_value=100)
            with col2:
                show_features = st.checkbox("Show Engineered Features", value=False)
        
        submitted = st.form_submit_button("🚀 Analyze Transaction", type="primary")
        
        if submitted:
            # Validate inputs
            if not tx_hash or not from_addr or not to_addr:
                st.error("Please fill in all required fields")
                return
            
            # Create DataFrame from input
            transaction_data = {
                'TxHash': [tx_hash],
                'BlockHeight': [block_height],
                'TimeStamp': [timestamp],
                'From': [from_addr],
                'To': [to_addr],
                'Value': [value]
            }
            
            df_input = pd.DataFrame(transaction_data)
            
            try:
                with st.spinner("Analyzing transaction with ML model..."):
                    df_result = backend.predict_with_risk(df_input)
                
                # Clear fetched data after use
                if 'fetched_tx' in st.session_state:
                    del st.session_state.fetched_tx
                
                # Display results
                risk_score = df_result['risk_score'].iloc[0]
                label = df_result['label'].iloc[0]
                action = df_result['action'].iloc[0]
                p_fraud = df_result['p_fraud'].iloc[0]
                
                st.success("Analysis Complete!")
                
                # Main results display
                col1, col2 = st.columns([2, 1])
                
                with col1:
                    # Risk score gauge
                    fig = go.Figure(go.Indicator(
                        mode = "gauge+number",
                        value = risk_score,
                        domain = {'x': [0, 1], 'y': [0, 1]},
                        title = {'text': "Risk Score", 'font': {'size': 24}},
                        gauge = {
                            'axis': {'range': [None, 100], 'tickwidth': 1, 'tickcolor': "darkblue"},
                            'bar': {'color': "darkblue"},
                            'bgcolor': "white",
                            'borderwidth': 2,
                            'bordercolor': "gray",
                            'steps': [
                                {'range': [0, 50], 'color': '#e8f5e8'},
                                {'range': [50, 80], 'color': '#fff3e0'},
                                {'range': [80, 100], 'color': '#ffebee'}
                            ],
                            'threshold': {
                                'line': {'color': "red", 'width': 4},
                                'thickness': 0.75,
                                'value': custom_threshold
                            }
                        }
                    ))
                    fig.update_layout(height=300)
                    st.plotly_chart(fig, use_container_width=True)
                
                with col2:
                    st.markdown("### Analysis Results")
                    st.metric("Risk Score", f"{risk_score}/100")
                    st.metric("Classification", label)
                    st.metric("Fraud Probability", f"{p_fraud:.4f}")
                    
                    # Risk level indicator
                    if risk_score >= 80:
                        st.error("HIGH RISK")
                    elif risk_score >= 50:
                        st.warning("MEDIUM RISK")
                    else:
                        st.success("LOW RISK")
                
                # Action recommendation
                st.subheader("Recommended Action")
                if risk_score >= 80:
                    st.error(f"**{action}**")
                elif risk_score >= 50:
                    st.warning(f" **{action}**")
                else:
                    st.success(f" **{action}**")
                
                # Transaction details
                st.subheader("Transaction Details")
                
                if privacy_mode:
                    st.info("Privacy mode enabled - addresses are hashed")
                    from_display = backend.hash_identifier(from_addr)
                    to_display = backend.hash_identifier(to_addr)
                else:
                    from_display = from_addr
                    to_display = to_addr
                
                # Enhanced details display
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("**Transaction Info**")
                    details_df = pd.DataFrame({
                        'Field': ['Hash', 'Block Height', 'Timestamp', 'Date/Time'],
                        'Value': [
                            tx_hash,
                            f"{block_height:,}",
                            f"{timestamp:,}",
                            datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
                        ]
                    })
                    st.dataframe(details_df, use_container_width=True, hide_index=True)
                
                with col2:
                    st.markdown("**Address & Value Info**")
                    address_df = pd.DataFrame({
                        'Field': ['From Address', 'To Address', 'Value (MATIC)', 'Value (Wei)'],
                        'Value': [
                            from_display,
                            to_display,
                            f"{value / 1e18:.6f}",
                            f"{value:,}"
                        ]
                    })
                    st.dataframe(address_df, use_container_width=True, hide_index=True)
                
                # Feature analysis
                if show_features:
                    st.subheader("🔧 Feature Engineering Analysis")
                    
                    try:
                        # Get engineered features
                        engineered_df = backend.engineer_features(df_input)
                        
                        # Display key engineered features
                        feature_cols = ['Value_log1p', 'from_tx_count', 'from_avg_value', 
                                      'to_tx_count', 'From_Frequency', 'To_Frequency',
                                      'time_since_last_tx_from', 'time_since_last_tx_to']
                        
                        available_features = [col for col in feature_cols if col in engineered_df.columns]
                        
                        if available_features:
                            feature_data = engineered_df[available_features].iloc[0]
                            
                            # Create feature importance visualization
                            feature_names = list(feature_data.index)
                            feature_values = list(feature_data.values)
                            
                            fig = px.bar(
                                x=feature_values,
                                y=feature_names,
                                orientation='h',
                                title="Engineered Feature Values",
                                labels={'x': 'Feature Value', 'y': 'Feature Name'}
                            )
                            fig.update_layout(height=400)
                            st.plotly_chart(fig, use_container_width=True)
                            
                            # Feature details table
                            feature_df = pd.DataFrame({
                                'Feature': feature_names,
                                'Value': [f"{val:.6f}" if isinstance(val, float) else str(val) for val in feature_values],
                                'Description': [
                                    'Log-transformed transaction value',
                                    'Number of transactions from sender',
                                    'Average value of transactions from sender',
                                    'Number of transactions to receiver',
                                    'Frequency of sender address',
                                    'Frequency of receiver address',
                                    'Time since last transaction from sender',
                                    'Time since last transaction to receiver'
                                ][:len(feature_names)]
                            })
                            
                            st.dataframe(feature_df, use_container_width=True, hide_index=True)
                        else:
                            st.info("Feature engineering data not available for display")
                            
                    except Exception as e:
                        st.error(f"Error displaying features: {e}")
                
                # Export results
                st.subheader("📥 Export Results")
                
                result_data = {
                    'analysis_timestamp': datetime.now().isoformat(),
                    'transaction_hash': tx_hash,
                    'risk_score': risk_score,
                    'fraud_probability': p_fraud,
                    'classification': label,
                    'recommended_action': action,
                    'transaction_details': {
                        'from_address': from_addr,
                        'to_address': to_addr,
                        'value_matic': value / 1e18,
                        'value_wei': value,
                        'block_height': block_height,
                        'timestamp': timestamp
                    }
                }
                
                col1, col2 = st.columns(2)
                
                with col1:
                    # JSON export
                    json_data = json.dumps(result_data, indent=2)
                    st.download_button(
                        label="Download JSON Report",
                        data=json_data,
                        file_name=f"chainguard_analysis_{tx_hash[:10]}.json",
                        mime="application/json"
                    )
                
                with col2:
                    # CSV export
                    csv_data = pd.DataFrame([{
                        'TxHash': tx_hash,
                        'RiskScore': risk_score,
                        'FraudProbability': p_fraud,
                        'Classification': label,
                        'Action': action,
                        'From': from_addr,
                        'To': to_addr,
                        'ValueMATIC': value / 1e18,
                        'BlockHeight': block_height,
                        'Timestamp': timestamp
                    }])
                    
                    st.download_button(
                        label=" Download CSV Report",
                        data=csv_data.to_csv(index=False),
                        file_name=f"chainguard_analysis_{tx_hash[:10]}.csv",
                        mime="text/csv"
                    )
                
            except Exception as e:
                st.error(f"Error analyzing transaction: {str(e)}")
                st.info("Please check your input data and try again.")


if __name__ == "__main__":
    main()