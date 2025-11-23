import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const MonitoringContext = createContext();

const initialState = {
  isActive: false,
  isConnected: false,
  totalProcessed: 0,
  totalFraud: 0,
  highRiskCount: 0,
  fraudRate: 0,
  processingRate: 0,
  liveTransactions: [],
  fraudHistory: [],
  highRiskTransactions: [],
  currentBlock: 0,
  networkStatus: 'disconnected',
  lastUpdate: null,
  error: null,
};

function monitoringReducer(state, action) {
  switch (action.type) {
    case 'SET_MONITORING_STATUS':
      return { ...state, isActive: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    case 'UPDATE_METRICS':
      return { ...state, ...action.payload };
    case 'ADD_TRANSACTION':
      const newTransactions = [action.payload, ...state.liveTransactions].slice(0, 1000);
      const newFraudHistory = [...state.fraudHistory, action.payload.fraud_probability || action.payload.risk_score / 100].slice(-1000);
      
      // High risk = suspicious (65-79%) for monitoring
      const newHighRisk = (action.payload.risk_score >= 65 && action.payload.risk_score < 80)
        ? [action.payload, ...state.highRiskTransactions].slice(0, 100)
        : state.highRiskTransactions;
      
      return {
        ...state,
        liveTransactions: newTransactions,
        fraudHistory: newFraudHistory,
        highRiskTransactions: newHighRisk,
        totalProcessed: state.totalProcessed + 1,
        // Only count 80%+ as fraud (critical threats)
        totalFraud: action.payload.label === 'Fraudulent' ? state.totalFraud + 1 : state.totalFraud,
        lastUpdate: new Date(),
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_DATA':
      return { ...initialState };
    default:
      return state;
  }
}

export function MonitoringProvider({ children }) {
  const [state, dispatch] = useReducer(monitoringReducer, initialState);

  // Configure axios base URL
  const API_BASE_URL = 'http://localhost:5000/api';
  
  // API calls
  const startMonitoring = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/monitoring/start`);
      if (response.data.success) {
        dispatch({ type: 'SET_MONITORING_STATUS', payload: true });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to start monitoring';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, message: errorMsg };
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/monitoring/stop`);
      if (response.data.success) {
        dispatch({ type: 'SET_MONITORING_STATUS', payload: false });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to stop monitoring';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, message: errorMsg };
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/monitoring/metrics`);
      if (response.data) {
        const metrics = response.data;
        dispatch({ 
          type: 'UPDATE_METRICS', 
          payload: {
            isActive: metrics.isActive,
            isConnected: metrics.isConnected,
            totalProcessed: metrics.totalProcessed,
            totalFraud: metrics.totalFraud,
            currentBlock: metrics.currentBlock,
            lastUpdate: metrics.lastUpdate,
          }
        });
      }
    } catch (error) {
      // Silently handle polling errors
      if (state.isActive) {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      }
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/monitoring/transactions?limit=10`);
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Only add new transactions (avoid duplicates)
        const existingHashes = new Set(state.liveTransactions.map(tx => tx.TxHash));
        const newTransactions = response.data.filter(tx => !existingHashes.has(tx.TxHash));
        
        newTransactions.forEach(transaction => {
          dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
        });
      }
    } catch (error) {
      // Silently handle polling errors
    }
  };

  // Polling for real-time updates
  useEffect(() => {
    let interval;
    if (state.isActive) {
      interval = setInterval(() => {
        fetchMetrics();
        fetchTransactions();
      }, 2000); // Poll every 2 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.isActive]);

  // Calculate derived metrics
  const derivedMetrics = {
    // Fraud rate = critical threats (80%+)
    fraudRate: state.totalProcessed > 0 ? (state.totalFraud / state.totalProcessed) * 100 : 0,
    // High risk count = suspicious transactions (65-79%)
    highRiskCount: state.liveTransactions.filter(tx => tx.risk_score >= 65 && tx.risk_score < 80).length,
    // Critical count = fraudulent transactions (80%+)
    criticalCount: state.liveTransactions.filter(tx => tx.risk_score >= 80).length,
    processingRate: state.lastUpdate 
      ? state.totalProcessed / Math.max((new Date() - new Date(state.lastUpdate)) / 60000, 1)
      : 0,
  };

  const contextValue = {
    ...state,
    ...derivedMetrics,
    startMonitoring,
    stopMonitoring,
    dispatch,
  };

  return (
    <MonitoringContext.Provider value={contextValue}>
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
}