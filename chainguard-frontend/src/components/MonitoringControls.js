import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Button,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Settings,
  Tune,
  Security,
} from '@mui/icons-material';
import { useMonitoring } from '../context/MonitoringContext';

function MonitoringControls({ onNotification }) {
  const { isActive, isConnected, startMonitoring, stopMonitoring } = useMonitoring();
  const [loading, setLoading] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState(80);
  const [monitoringMode, setMonitoringMode] = useState('realtime');

  const handleStartMonitoring = async () => {
    setLoading(true);
    try {
      const success = await startMonitoring();
      if (success) {
        onNotification('Real-time monitoring started successfully', 'success');
      } else {
        onNotification('Failed to start monitoring', 'error');
      }
    } catch (error) {
      onNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      const success = await stopMonitoring();
      if (success) {
        onNotification('Monitoring stopped', 'info');
      } else {
        onNotification('Failed to stop monitoring', 'error');
      }
    } catch (error) {
      onNotification(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Security sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Monitoring Controls
            </Typography>
            <Chip
              label={isActive ? 'ACTIVE' : 'INACTIVE'}
              color={isActive ? 'success' : 'default'}
              variant="filled"
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {!isActive ? (
              <Button
                variant="contained"
                color="success"
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleStartMonitoring}
                disabled={loading}
                size="large"
                sx={{ minWidth: 180 }}
              >
                {loading ? 'Starting...' : 'Start Monitoring'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={loading ? <CircularProgress size={20} /> : <Stop />}
                onClick={handleStopMonitoring}
                disabled={loading}
                size="large"
                sx={{ minWidth: 180 }}
              >
                {loading ? 'Stopping...' : 'Stop Monitoring'}
              </Button>
            )}
          </Box>
        </Box>

        {/* Configuration Panel */}
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Risk Threshold */}
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Risk Threshold: {riskThreshold}%
            </Typography>
            <Slider
              value={riskThreshold}
              onChange={(e, value) => setRiskThreshold(value)}
              min={0}
              max={100}
              step={5}
              marks={[
                { value: 0, label: '0%' },
                { value: 50, label: '50%' },
                { value: 100, label: '100%' },
              ]}
              sx={{ width: 200 }}
              disabled={isActive}
            />
          </Box>

          {/* Monitoring Mode */}
          <FormControl sx={{ minWidth: 150 }} disabled={isActive}>
            <InputLabel>Mode</InputLabel>
            <Select
              value={monitoringMode}
              label="Mode"
              onChange={(e) => setMonitoringMode(e.target.value)}
            >
              <MenuItem value="realtime">Real-time</MenuItem>
              <MenuItem value="batch">Batch</MenuItem>
              <MenuItem value="historical">Historical</MenuItem>
            </Select>
          </FormControl>

          {/* Network Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Network:
            </Typography>
            <Chip
              label={isConnected ? 'Polygon Mainnet' : 'Disconnected'}
              color={isConnected ? 'primary' : 'default'}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Status Messages */}
        {isActive && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              🛡️ ChainGuard is actively monitoring Polygon mainnet for fraudulent transactions.
              Risk threshold set to {riskThreshold}%.
            </Typography>
          </Alert>
        )}

        {!isConnected && !isActive && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Click "Start Monitoring" to connect to Polygon mainnet and begin real-time fraud detection.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default MonitoringControls;