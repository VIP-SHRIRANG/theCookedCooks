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
      const newFraudHistory = [...state.fraudHistory, action.payload.fraud_probability].slice(-1000);
      const newHighRisk = action.payload.risk_score >= 80 
        ? [action.payload, ...state.highRiskTransactions].slice(0, 100)
        : state.highRiskTransactions;
      
      return {
        ...state,
        liveTransactions: newTransactions,
        fraudHistory: newFraudHistory,
        highRiskTransactions: newHighRisk,
        totalProcessed: state.totalProcessed + 1,
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

  // API calls
  const startMonitoring = async () => {
    try {
      const response = await axios.post('/api/monitoring/start');
      if (response.data.success) {
        dispatch({ type: 'SET_MONITORING_STATUS', payload: true });
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return false;
    }
  };

  const stopMonitoring = async () => {
    try {
      const response = await axios.post('/api/monitoring/stop');
      if (response.data.success) {
        dispatch({ type: 'SET_MONITORING_STATUS', payload: false });
        return true;
      }
      return false;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return false;
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/monitoring/metrics');
      if (response.data) {
        dispatch({ type: 'UPDATE_METRICS', payload: response.data });
      }
    } catch (error) {
      // Silently handle errors for polling
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get('/api/monitoring/transactions');
      if (response.data && response.data.length > 0) {
        response.data.forEach(transaction => {
          dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
        });
      }
    } catch (error) {
      // Silently handle errors for polling
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
    fraudRate: state.totalProcessed > 0 ? (state.totalFraud / state.totalProcessed) * 100 : 0,
    highRiskCount: state.liveTransactions.filter(tx => tx.risk_score >= 80).length,
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