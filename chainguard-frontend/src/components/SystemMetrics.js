import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Memory,
  Storage,
  Speed,
  NetworkCheck,
  Refresh,
  Computer,
  CloudSync,
} from '@mui/icons-material';

function SystemMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Get basic system info that's available in browser
      const memoryInfo = navigator.deviceMemory ? {
        deviceMemory: navigator.deviceMemory,
        available: true
      } : null;

      const connectionInfo = navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        available: true
      } : null;

      const performanceInfo = performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        available: true
      } : null;

      setMetrics({
        memory: memoryInfo,
        network: connectionInfo,
        performance: performanceInfo,
        timestamp: new Date().toISOString()
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getConnectionQuality = (effectiveType) => {
    switch (effectiveType) {
      case '4g': return { label: 'Excellent', color: 'success' };
      case '3g': return { label: 'Good', color: 'warning' };
      case '2g': return { label: 'Poor', color: 'error' };
      case 'slow-2g': return { label: 'Very Poor', color: 'error' };
      default: return { label: 'Unknown', color: 'info' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        p: 3 
      }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            System Metrics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browser-available system information and performance data
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Tooltip title="Refresh Metrics">
            <IconButton 
              size="small" 
              sx={{ color: 'primary.main' }}
              onClick={fetchSystemMetrics}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* JavaScript Memory Usage */}
        {metrics?.performance?.available && (
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
              border: '1px solid rgba(0,188,212,0.2)',
              borderRadius: 3,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Memory sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    JS Memory Usage
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: 'warning.main',
                    mb: 1
                  }}>
                    {formatBytes(metrics.performance.usedJSHeapSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Used of {formatBytes(metrics.performance.totalJSHeapSize)} allocated
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Limit: {formatBytes(metrics.performance.jsHeapSizeLimit)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Device Memory */}
        {metrics?.memory?.available && (
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
              border: '1px solid rgba(0,188,212,0.2)',
              borderRadius: 3,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Computer sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Device Memory
                  </Typography>
                </Box>
                
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: 'primary.main',
                  mb: 1
                }}>
                  {metrics.memory.deviceMemory} GB
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approximate device RAM
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Network Connection */}
        {metrics?.network?.available && (
          <Grid item xs={12} md={6} lg={4}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
              border: '1px solid rgba(0,188,212,0.2)',
              borderRadius: 3,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NetworkCheck sx={{ color: 'info.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Network Connection
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getConnectionQuality(metrics.network.effectiveType).label}
                    color={getConnectionQuality(metrics.network.effectiveType).color}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Type: {metrics.network.effectiveType?.toUpperCase()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Downlink: {metrics.network.downlink} Mbps
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    RTT: {metrics.network.rtt}ms
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* No Data Available Message */}
        {(!metrics?.performance?.available && !metrics?.memory?.available && !metrics?.network?.available) && (
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
              border: '1px solid rgba(0,188,212,0.2)',
              borderRadius: 3,
            }}>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Speed sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                  Limited System Information Available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                  Browser security restrictions limit access to detailed system metrics. 
                  For comprehensive monitoring, consider implementing server-side metrics collection.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default SystemMetrics;