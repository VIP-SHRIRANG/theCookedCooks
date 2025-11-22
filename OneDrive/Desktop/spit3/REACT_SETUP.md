# ChainGuard React Dashboard Setup

## 🎯 **Professional Cybersecurity Dashboard**

I've created a complete React.js frontend to replace the Streamlit interface with a professional cybersecurity analyst dashboard.

## 🏗️ **Project Structure**

```
chainguard-frontend/
├── package.json              # Dependencies & scripts
├── public/
│   ├── index.html           # Main HTML template
│   └── manifest.json        # PWA manifest
└── src/
    ├── index.js             # App entry point with dark theme
    ├── App.js               # Main application layout
    ├── context/
    │   └── MonitoringContext.js  # Global state management
    └── components/
        ├── Dashboard.js          # Main metrics dashboard
        ├── MonitoringControls.js # Start/stop controls
        ├── TransactionTable.js   # Live transaction table
        ├── RealTimeCharts.js     # Data visualization
        └── ThreatMap.js          # Threat intelligence panel
```

## 🎨 **Professional Design Features**

### **Cybersecurity Theme**
- **Dark Mode**: Optimized for security operations centers
- **Color Scheme**: Cyan primary, red alerts, professional gradients
- **Typography**: Inter font family for clean, professional look
- **Material-UI**: Enterprise-grade component library

### **Dashboard Components**
1. **🛡️ Monitoring Controls** - Start/stop with real-time status
2. **📊 Live Metrics** - Key performance indicators with progress bars
3. **📋 Transaction Table** - Searchable, paginated transaction list
4. **📈 Real-Time Charts** - Fraud trends, risk distribution, volume analysis
5. **🚨 Threat Intelligence** - Active threat detection and alerts

## 🚀 **Quick Start**

### **Option 1: Automated Launch (Recommended)**
```bash
python start_chainguard_react.py
```

### **Option 2: Manual Setup**
```bash
# 1. Start API server
python api_server.py

# 2. In another terminal, start React app
cd chainguard-frontend
npm install
npm start
```

## 🔌 **Backend Integration**

### **Flask API Server** (`api_server.py`)
- **Real-time monitoring** with background threads
- **RESTful API** for React frontend
- **CORS enabled** for cross-origin requests
- **WebSocket-like polling** for live updates

### **API Endpoints**
- `POST /api/monitoring/start` - Start blockchain monitoring
- `POST /api/monitoring/stop` - Stop monitoring
- `GET /api/monitoring/metrics` - Current statistics
- `GET /api/monitoring/transactions` - Recent transactions
- `GET /api/health` - System health check

## 🎯 **Key Features**

### **Professional UI Elements**
- ✅ **Status Indicators** - Active/inactive monitoring states
- ✅ **Risk Score Chips** - Color-coded risk levels
- ✅ **Progress Bars** - Visual fraud rate indicators
- ✅ **Data Tables** - Sortable, searchable transaction lists
- ✅ **Real-time Charts** - Line, area, bar, and pie charts
- ✅ **Threat Alerts** - Dynamic threat level assessment

### **Cybersecurity Features**
- 🔒 **Privacy Mode** - Address masking toggle
- 🚨 **Threat Intelligence** - Active threat detection
- 📊 **Risk Analytics** - Multi-dimensional risk analysis
- 🔍 **Transaction Search** - Advanced filtering capabilities
- 🌐 **Blockchain Explorer** - Direct PolygonScan integration

### **Real-time Capabilities**
- ⚡ **Live Updates** - 2-second polling for real-time data
- 📈 **Dynamic Charts** - Auto-updating visualizations
- 🔄 **Background Processing** - Non-blocking transaction analysis
- 📱 **Responsive Design** - Works on all screen sizes

## 🎨 **Visual Design**

### **Color Palette**
- **Primary**: `#00d4ff` (Cyber cyan)
- **Error/Fraud**: `#ff4444` (Alert red)
- **Success**: `#00ff88` (Safe green)
- **Warning**: `#ffaa00` (Caution orange)
- **Background**: `#0a0e1a` (Deep space blue)

### **Components Styling**
- **Cards**: Gradient backgrounds with subtle borders
- **Buttons**: Rounded corners, hover effects
- **Charts**: Dark theme with neon accents
- **Tables**: Zebra striping, hover highlights

## 📊 **Dashboard Sections**

### **1. Monitoring Controls**
- Large start/stop buttons with loading states
- Configuration sliders for risk thresholds
- Network connection status indicators
- Real-time status alerts

### **2. Metrics Dashboard**
- **Total Processed** - Transaction count with rate
- **Fraudulent Detected** - Fraud count with percentage
- **High Risk** - Risk score ≥ 80 transactions
- **Processing Rate** - Transactions per minute

### **3. Transaction Table**
- **Status Column** - Visual risk indicators
- **Hash/Addresses** - Truncated with copy buttons
- **Value** - Formatted ETH amounts
- **Risk Scores** - Color-coded chips
- **Actions** - PolygonScan links

### **4. Real-Time Charts**
- **Fraud Trend** - Area chart of fraud probability over time
- **Risk Distribution** - Pie chart of risk score ranges
- **Transaction Volume** - Bar chart of ETH values
- **24-Hour Activity** - Line chart of hourly patterns

### **5. Threat Intelligence**
- **Threat Level** - Dynamic assessment (LOW/MEDIUM/HIGH/CRITICAL)
- **Active Threats** - List of detected threat patterns
- **Recent High-Risk** - Latest suspicious transactions
- **Threat Progress** - Visual threat level indicator

## 🔧 **Technical Implementation**

### **State Management**
- **React Context** - Global monitoring state
- **useReducer** - Complex state updates
- **Real-time Polling** - Automatic data refresh

### **Data Visualization**
- **Recharts** - Professional chart library
- **Responsive Charts** - Auto-sizing containers
- **Custom Tooltips** - Branded hover information
- **Color Theming** - Consistent chart colors

### **Performance Optimization**
- **Data Limits** - 1000 transactions max in memory
- **Pagination** - Table performance optimization
- **Debounced Search** - Efficient filtering
- **Background Updates** - Non-blocking UI

## 🚀 **Production Ready**

### **Build & Deploy**
```bash
cd chainguard-frontend
npm run build
```

### **Features**
- ✅ **Production Build** - Optimized bundle
- ✅ **PWA Ready** - Progressive Web App capabilities
- ✅ **Mobile Responsive** - Touch-optimized interface
- ✅ **Error Boundaries** - Graceful error handling
- ✅ **Loading States** - Professional loading indicators

## 🎉 **Result**

You now have a **professional-grade cybersecurity dashboard** that looks and feels like enterprise security software used by SOC analysts. The interface is:

- **Visually Impressive** - Dark theme with cyber aesthetics
- **Highly Functional** - All Streamlit features migrated
- **Performance Optimized** - Real-time updates without lag
- **Production Ready** - Scalable architecture

**Launch it with:** `python start_chainguard_react.py`

The dashboard will be available at `http://localhost:3000` with the API at `http://localhost:5000`.