# 🛡️ ChainGuard - Complete Setup & Usage Guide

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Installation Steps](#installation-steps)
3. [Quick Start](#quick-start)
4. [System Architecture](#system-architecture)
5. [Usage Modes](#usage-modes)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Advanced Features](#advanced-features)

## 🖥️ System Requirements

### Minimum Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux

### Required Dependencies
```bash
# Python packages
pip install flask flask-cors pandas numpy scikit-learn joblib catboost web3 python-dotenv

# Node.js packages (auto-installed)
cd chainguard-frontend && npm install
```

## 🚀 Installation Steps

### Step 1: Clone and Setup
```bash
# Navigate to project directory
cd chainguard

# Install Python dependencies
pip install -r requirements.txt

# Setup React frontend
cd chainguard-frontend
npm install
cd ..
```

### Step 2: Verify Core Files
Ensure these essential files exist:
- ✅ `api_server.py` - Main Flask API server
- ✅ `backend.py` - ML fraud detection engine
- ✅ `best_model_retrained.pkl` - Trained CatBoost model
- ✅ `ensemble_feature_names.pkl` - Model feature definitions
- ✅ `chainguard-frontend/` - React dashboard directory

### Step 3: Environment Setup (Optional)
Create `.env` file for custom configuration:
```env
# Blockchain RPC endpoints (optional - uses defaults if not set)
POLYGON_RPC_URL=your_polygon_rpc_url
ALCHEMY_API_KEY=your_alchemy_key

# Risk thresholds (optional)
SUSPICIOUS_THRESHOLD=65
BLOCKED_THRESHOLD=80
```

## ⚡ Quick Start

### Option 1: Complete System (Recommended)
```bash
# Windows
start_chainguard.bat

# Linux/Mac
python start_chainguard.py
```

### Option 2: Manual Launch
```bash
# Terminal 1: Start API Server
python api_server.py

# Terminal 2: Start React Frontend
cd chainguard-frontend
npm start
```

### Access Points
- 🌐 **Main Dashboard**: http://localhost:3000
- 📡 **API Server**: http://localhost:5000
- 🔍 **Health Check**: http://localhost:5000/api/health

## 🏗️ System Architecture

### Backend Components
```
api_server.py          # Flask API server with blockchain connectivity
├── Web3 Integration   # Real-time Polygon Mainnet monitoring
├── SQLite Database    # Transaction storage and analytics
├── ML Pipeline        # CatBoost fraud detection model
└── REST API           # Frontend communication endpoints

backend.py             # ML fraud detection engine
├── Feature Engineering # 15 sophisticated fraud indicators
├── Risk Scoring       # 0-100 risk assessment
├── Batch Processing   # CSV analysis capabilities
└── Privacy Protection # Address hashing for sensitive data
```

### Frontend Components
```
chainguard-frontend/
├── Dashboard.js           # Main control center
├── RealTimeCharts.js      # Live analytics and charts
├── TransactionTable.js    # Transaction monitoring table
├── ThreatMap.js          # Geographic threat visualization
├── NodeAnalysis.js       # Fraud pattern analysis
└── MonitoringControls.js # System controls and settings
```

## 🎯 Usage Modes

### 1. Real-Time Monitoring
**Purpose**: Live blockchain fraud detection
**How to use**:
1. Open dashboard at http://localhost:3000
2. Click "Start Monitoring" button
3. Watch live transactions appear with risk scores
4. Monitor alerts for high-risk transactions (≥80%)

**Features**:
- Live transaction stream from Polygon Mainnet
- Instant ML-based fraud scoring
- Real-time charts and analytics
- Automatic high-risk alerts

### 2. CSV Batch Analysis
**Purpose**: Analyze large transaction datasets
**How to use**:
1. Navigate to "CSV Analysis" tab
2. Upload your CSV file (any size supported)
3. Wait for processing to complete
4. Download results and analysis reports

**Required CSV Format**:
```csv
TxHash,From,To,Value,TimeStamp
0x123...,0xabc...,0xdef...,1000000000000000000,1640995200
```

### 3. Node Analysis
**Purpose**: Identify fraud patterns and suspicious clusters
**How to use**:
1. Go to "Node Analysis" tab
2. View fraud network visualizations
3. Analyze suspicious wallet clusters
4. Export findings for investigation

## ⚙️ Configuration

### Risk Thresholds
Default settings (configurable in dashboard):
- **Approved**: 0-64% risk score (🟢 Green)
- **Suspicious**: 65-79% risk score (🟡 Yellow)
- **Blocked**: 80-100% risk score (🔴 Red)

### System Settings
Access via Dashboard → Settings:
- **Monitoring Interval**: Transaction polling frequency
- **Alert Sensitivity**: Risk threshold for notifications
- **Privacy Mode**: Enable/disable address hashing
- **Export Format**: Choose JSON, CSV, or PDF reports

### Database Configuration
SQLite database (`chainguard.db`) stores:
- Transaction history and risk scores
- Node analysis results
- System performance metrics
- Alert logs and audit trails

## 🔧 Troubleshooting

### Common Issues

#### "Module not found" errors
```bash
# Reinstall dependencies
pip install -r requirements.txt
cd chainguard-frontend && npm install
```

#### React frontend won't start
```bash
# Clear cache and reinstall
cd chainguard-frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

#### API server connection issues
```bash
# Check if port 5000 is available
netstat -an | grep 5000

# Try alternative port
export FLASK_RUN_PORT=5001
python api_server.py
```

#### Model loading errors
```bash
# Verify model files exist
ls -la *.pkl

# If missing, the system will use fallback Isolation Forest model
```

### Performance Optimization

#### For High Transaction Volume
```python
# In api_server.py, adjust these settings:
BATCH_SIZE = 100          # Process transactions in batches
PROCESSING_INTERVAL = 1   # Seconds between processing cycles
MAX_HISTORY = 1000       # Maximum transactions to keep in memory
```

#### For Low-Resource Systems
```python
# Reduce memory usage:
ENABLE_CACHING = False    # Disable transaction caching
CHART_DATA_LIMIT = 50    # Limit chart data points
ENABLE_LOGGING = False   # Reduce log output
```

## 🚀 Advanced Features

### Model Retraining
Update the fraud detection model with new data:
```bash
python start_retrain.py
# Follow prompts to retrain with second_order_df.csv
```

### API Integration
Use ChainGuard in your own applications:
```python
import requests

# Analyze single transaction
response = requests.post('http://localhost:5000/api/analyze', json={
    'transactions': [transaction_data]
})
risk_score = response.json()['results'][0]['risk_score']

# Get system status
status = requests.get('http://localhost:5000/api/health').json()
```

### Custom Deployment
For production environments:
```bash
# Use production launcher
python start_chainguard_production.py

# Or deploy with Docker (if Dockerfile exists)
docker build -t chainguard .
docker run -p 5000:5000 -p 3000:3000 chainguard
```

## 📊 Understanding the Results

### Risk Score Interpretation
- **0-30**: Very low risk, normal transaction patterns
- **31-64**: Low risk, approved for processing
- **65-79**: Medium risk, requires additional verification
- **80-89**: High risk, likely fraudulent activity
- **90-100**: Very high risk, immediate blocking recommended

### Feature Analysis
The ML model analyzes 15 key features:
1. **Value_log1p**: Transaction amount (log-transformed)
2. **from_tx_count**: Sender's transaction frequency
3. **from_avg_value**: Sender's average transaction value
4. **to_tx_count**: Receiver's transaction frequency
5. **From_Frequency**: Address frequency patterns
6. **time_since_last_tx_from**: Temporal behavior analysis
7. **hour_of_day**: Transaction timing patterns
8. **day_of_week**: Weekly activity patterns
9. **value_to_avg_ratio**: Value deviation analysis
10. **gas_price_percentile**: Gas price behavior
11. **unique_interactions**: Network interaction patterns
12. **velocity_score**: Transaction velocity analysis
13. **concentration_score**: Value concentration patterns
14. **temporal_clustering**: Time-based clustering
15. **network_centrality**: Network position analysis

## 🎉 Success Indicators

Your ChainGuard system is working correctly when you see:
- ✅ API server running on port 5000
- ✅ React dashboard accessible on port 3000
- ✅ Live transactions appearing in the dashboard
- ✅ Risk scores being calculated (0-100 range)
- ✅ Charts updating with real-time data
- ✅ Database file (`chainguard.db`) being created
- ✅ No error messages in console logs

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Ensure required model files are present
4. Check console logs for specific error messages
5. Try the manual launch method for debugging

**ChainGuard is now ready to protect your DeFi ecosystem!** 🛡️

---
*Built for enterprise-grade fraud detection in decentralized finance*