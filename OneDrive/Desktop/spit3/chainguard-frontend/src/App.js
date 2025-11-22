import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { Shield, Security } from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import MonitoringControls from './components/MonitoringControls';
import TransactionTable from './components/TransactionTable';
import RealTimeCharts from './components/RealTimeCharts';
import ThreatMap from './components/ThreatMap';
import { MonitoringProvider } from './context/MonitoringContext';

function App() {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <MonitoringProvider>
      <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Top Navigation Bar */}
        <AppBar 
          position="static" 
          sx={{ 
            bgcolor: 'background.paper',
            borderBottom: '1px solid #333844',
            boxShadow: 'none'
          }}
        >
          <Toolbar>
            <Shield sx={{ mr: 2, color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
              ChainGuard
            </Typography>
            <Typography variant="body2" sx={{ mr: 3, color: 'text.secondary' }}>
              Real-Time DeFi Fraud Detection
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security fontSize="small" />
                  Privacy Mode
                </Box>
              }
            />
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Grid container spacing={3}>
            {/* Monitoring Controls */}
            <Grid item xs={12}>
              <MonitoringControls onNotification={showNotification} />
            </Grid>

            {/* Main Dashboard Metrics */}
            <Grid item xs={12}>
              <Dashboard privacyMode={privacyMode} />
            </Grid>

            {/* Charts Section */}
            <Grid item xs={12} lg={8}>
              <RealTimeCharts />
            </Grid>

            {/* Threat Map */}
            <Grid item xs={12} lg={4}>
              <ThreatMap />
            </Grid>

            {/* Transaction Table */}
            <Grid item xs={12}>
              <TransactionTable privacyMode={privacyMode} />
            </Grid>
          </Grid>
        </Container>

        {/* Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseNotification} 
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </MonitoringProvider>
  );
}

export default App;
