import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Speed,
  Memory,
  Storage,
  NetworkCheck,
  Security,
  CheckCircle,
  Warning,
  Error,
  Refresh,
  CloudSync,
  Analytics,
  Shield,
  Timeline,
} from '@mui/icons-material';
import axios from 'axios';

function SystemStatus() {
  const [systemHealth, setSystemHealth] = useState({
    ensemble_system: { loaded: false },
    fallback_models: { catboost_available: false, enhanced_analyzer: false }
  });
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrainDialog, setRetrainDialog] = useState(false);
  const [retraining, setRetraining] = useState(false);

  const fetchSystemHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setSystemHealth(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch system health');
      console.error('Error fetching system health:', err);
    }
  };

  const fetchTrainingHistory = async () => {
    try {
      const response = await axios.get('/api/training/history');
      setTrainingHistory(response.data);
    } catch (err) {
      console.error('Error fetching training history:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchSystemHealth(), fetchTrainingHistory()]);
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      await axios.post('/api/nodes/retrain');
    } catch (err) {
      setError('Failed to trigger model retraining');
    } finally {
      setRetraining(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case true:
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
      case false:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case true:
        return <CheckCircle />;
      case 'warning':
        return <Warning />;
      case 'error':
      case false:
        return <Error />;
      default:
        return <Warning />;
    }
  };

  // Mock system metrics for demonstration
  const systemMetrics = {
    cpu_usage: 45,
    memory_usage: 62,
    disk_usage: 38,
    network_latency: 23,
    active_connections: 1247,
    processed_today: 45678,
    uptime: '7d 14h 32m',
    version: '2.1.0',
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          System Status
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading system status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
            <Speed />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              System Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time system health and performance monitoring
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchSystemHealth();
              fetchTrainingHistory();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Analytics />}
            onClick={() => setRetrainDialog(true)}
            color="secondary"
          >
            Retrain Model
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(56,142,60,0.05) 100%)',
            border: '1px solid rgba(76,175,80,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">System Health</Typography>
              </Box>
              <Chip
                label={systemHealth.status || 'Unknown'}
                color={getStatusColor(systemHealth.status)}
                sx={{ textTransform: 'capitalize' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.05) 100%)',
            border: '1px solid rgba(0,188,212,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkCheck sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Blockchain</Typography>
              </Box>
              <Chip
                label={systemHealth.blockchain_connected ? 'Connected' : 'Disconnected'}
                color={getStatusColor(systemHealth.blockchain_connected)}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(156,39,176,0.1) 0%, rgba(123,31,162,0.05) 100%)',
            border: '1px solid rgba(156,39,176,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Database</Typography>
              </Box>
              <Chip
                label={systemHealth.database_connected ? 'Connected' : 'Disconnected'}
                color={getStatusColor(systemHealth.database_connected)}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(245,124,0,0.05) 100%)',
            border: '1px solid rgba(255,152,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Monitoring</Typography>
              </Box>
              <Chip
                label={systemHealth.monitoring_active ? 'Active' : 'Inactive'}
                color={getStatusColor(systemHealth.monitoring_active)}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ML Models Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: systemHealth.ensemble_system?.loaded 
              ? 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(56,142,60,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(245,124,0,0.05) 100%)',
            border: systemHealth.ensemble_system?.loaded 
              ? '1px solid rgba(76,175,80,0.2)'
              : '1px solid rgba(255,152,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Analytics sx={{ 
                  color: systemHealth.ensemble_system?.loaded ? 'success.main' : 'warning.main', 
                  mr: 1 
                }} />
                <Typography variant="h6">Ensemble System</Typography>
              </Box>
              <Chip
                label={systemHealth.ensemble_system?.loaded ? 'Active' : 'Not Available'}
                color={systemHealth.ensemble_system?.loaded ? 'success' : 'warning'}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              {systemHealth.ensemble_system?.loaded && systemHealth.ensemble_system?.performance && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    F1: {(systemHealth.ensemble_system.performance.f1_score * 100).toFixed(1)}% | 
                    Precision: {(systemHealth.ensemble_system.performance.precision * 100).toFixed(1)}% | 
                    Recall: {(systemHealth.ensemble_system.performance.recall * 100).toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(63,81,181,0.1) 0%, rgba(48,63,159,0.05) 100%)',
            border: '1px solid rgba(63,81,181,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Shield sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Fallback Models</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="CatBoost"
                  color={systemHealth.fallback_models?.catboost_available ? 'success' : 'default'}
                  size="small"
                  variant={systemHealth.fallback_models?.catboost_available ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Enhanced Analyzer"
                  color={systemHealth.fallback_models?.enhanced_analyzer ? 'success' : 'default'}
                  size="small"
                  variant={systemHealth.fallback_models?.enhanced_analyzer ? 'filled' : 'outlined'}
                />
                <Chip
                  label="Isolation Forest"
                  color="success"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <Speed sx={{ mr: 1 }} />
                Performance Metrics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">CPU Usage</Typography>
                      <Typography variant="body2">{systemMetrics.cpu_usage}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemMetrics.cpu_usage}
                      color={systemMetrics.cpu_usage > 80 ? 'error' : systemMetrics.cpu_usage > 60 ? 'warning' : 'success'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Memory Usage</Typography>
                      <Typography variant="body2">{systemMetrics.memory_usage}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemMetrics.memory_usage}
                      color={systemMetrics.memory_usage > 80 ? 'error' : systemMetrics.memory_usage > 60 ? 'warning' : 'success'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Disk Usage</Typography>
                      <Typography variant="body2">{systemMetrics.disk_usage}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={systemMetrics.disk_usage}
                      color={systemMetrics.disk_usage > 80 ? 'error' : systemMetrics.disk_usage > 60 ? 'warning' : 'success'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Network Latency</Typography>
                      <Typography variant="body2">{systemMetrics.network_latency}ms</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(systemMetrics.network_latency, 100)}
                      color={systemMetrics.network_latency > 100 ? 'error' : systemMetrics.network_latency > 50 ? 'warning' : 'success'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>



      {/* Retrain Dialog */}
      <Dialog open={retrainDialog} onClose={() => setRetrainDialog(false)}>
        <DialogTitle>Retrain ML Model</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will trigger a complete retraining of the fraud detection model using the latest transaction data.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Model retraining may take several minutes and will temporarily affect detection accuracy.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            The system will continue to operate using the current model during retraining.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetrainDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRetrain}
            variant="contained"
            color="primary"
            disabled={retraining}
          >
            {retraining ? 'Retraining...' : 'Start Retraining'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SystemStatus;