import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Paper,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security,
  Timeline,
  Warning,
  CheckCircle,
  Speed,
  NetworkCheck,
  Shield,
  TrendingUp,
  Visibility,
  Analytics,
} from '@mui/icons-material';
import { useMonitoring } from '../context/MonitoringContext';

function MetricCard({ title, value, subtitle, icon, color = 'primary', progress, trend }) {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative', 
        overflow: 'visible',
        background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.05) 100%)',
        border: '1px solid rgba(0,188,212,0.2)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 25px rgba(0,188,212,0.3)',
          border: '1px solid rgba(0,188,212,0.4)',
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                bgcolor: `${color}.main`,
                width: 48,
                height: 48,
                mr: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {icon}
            </Avatar>
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          
          {trend && (
            <Tooltip title="Trending up">
              <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
            </Tooltip>
          )}
        </Box>
        
        <Typography 
          variant="h2" 
          sx={{ 
            fontWeight: 800, 
            mb: 1,
            background: `linear-gradient(45deg, ${color === 'primary' ? '#00bcd4' : color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}, #ffffff)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {value}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
        
        {progress !== undefined && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: `${color}.main`,
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${color === 'primary' ? '#00bcd4' : color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50'}, ${color === 'primary' ? '#0097a7' : color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#388e3c'})`,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {progress.toFixed(1)}% of capacity
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({ title, status, description, icon, isActive }) {
  const statusColor = isActive ? 'success' : 'error';
  const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        background: isActive 
          ? 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(56,142,60,0.05) 100%)'
          : 'linear-gradient(135deg, rgba(244,67,54,0.1) 0%, rgba(211,47,47,0.05) 100%)',
        border: `1px solid ${isActive ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 6px 20px ${isActive ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}`,
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                bgcolor: `${statusColor}.main`,
                width: 48,
                height: 48,
                mr: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {icon}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          
          <Chip
            label={statusText}
            color={statusColor}
            variant="filled"
            size="medium"
            sx={{ 
              fontWeight: 700,
              fontSize: '0.75rem',
              px: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />
        </Box>
        
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
          {status}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
        
        {/* Status indicator */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: `${statusColor}.main`,
              mr: 1,
              animation: isActive ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {isActive ? 'Live monitoring' : 'Monitoring stopped'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function Dashboard({ privacyMode }) {
  const {
    isActive,
    isConnected,
    totalProcessed,
    totalFraud,
    fraudRate,
    highRiskCount,
    processingRate,
    currentBlock,
    lastUpdate,
  } = useMonitoring();

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getLastUpdateText = () => {
    if (!lastUpdate) return 'Never';
    return 'Just now'; // Simplified for now
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.1) 100%)',
          border: '1px solid rgba(0,188,212,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Shield sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            ChainGuard Security Dashboard
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Real-time DeFi fraud detection and blockchain security monitoring
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            icon={<Analytics />} 
            label="AI-Powered Detection" 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            icon={<Visibility />} 
            label="Real-time Monitoring" 
            color="secondary" 
            variant="outlined" 
          />
          <Chip 
            icon={<Shield />} 
            label="Enterprise Security" 
            color="success" 
            variant="outlined" 
          />
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Status Cards */}
        <Grid item xs={12} lg={6}>
          <StatusCard
            title="Monitoring Status"
            status={isActive ? "Real-time monitoring active" : "Monitoring stopped"}
            description={isActive ? "Scanning Polygon mainnet for fraudulent transactions using advanced ML algorithms" : "Click start to begin monitoring blockchain transactions"}
            icon={<Security />}
            isActive={isActive}
          />
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <StatusCard
            title="Network Connection"
            status={isConnected ? `Connected to Polygon (Block ${formatNumber(currentBlock)})` : "Disconnected"}
            description={isConnected ? `Last update: ${getLastUpdateText()} • Latency: <50ms` : "No connection to blockchain network"}
            icon={<NetworkCheck />}
            isActive={isConnected}
          />
        </Grid>

        {/* Metric Cards */}
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Total Processed"
            value={formatNumber(totalProcessed)}
            subtitle={`${processingRate.toFixed(1)} tx/min processing rate`}
            icon={<Timeline />}
            color="primary"
            trend={totalProcessed > 0}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Fraud Detected"
            value={formatNumber(totalFraud)}
            subtitle={`${fraudRate.toFixed(2)}% fraud rate detected`}
            icon={<Warning />}
            color="error"
            progress={Math.min(fraudRate * 5, 100)}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="High Risk Alerts"
            value={formatNumber(highRiskCount)}
            subtitle="Risk score ≥ 80% flagged"
            icon={<Security />}
            color="warning"
            progress={Math.min((highRiskCount / Math.max(totalProcessed, 1)) * 1000, 100)}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard
            title="Processing Rate"
            value={`${processingRate.toFixed(1)}`}
            subtitle="transactions per minute"
            icon={<Speed />}
            color="success"
            progress={Math.min(processingRate * 3, 100)}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;