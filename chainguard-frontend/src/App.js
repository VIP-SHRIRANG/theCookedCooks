import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { 
  Shield, 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Timeline,
  Warning,
  Settings,
  Notifications,
  Search,
  NetworkCheck,
  Assessment,
  CloudSync,
  Speed,
  AccountTree
} from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import MonitoringControls from './components/MonitoringControls';
import TransactionTable from './components/TransactionTable';
import RealTimeCharts from './components/RealTimeCharts';
import SystemStatus from './components/SystemStatus';
import ThreatMap from './components/ThreatMap';
import NodeAnalysis from './components/NodeAnalysis';
import AlertsPanel from './components/AlertsPanel';
import SearchPanel from './components/SearchPanel';
import SettingsPanel from './components/SettingsPanel';
import CSVAnalysis from './components/CSVAnalysis';
import { MonitoringProvider } from './context/MonitoringContext';

function App() {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [systemStatus] = useState('online');
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const showNotification = (message, severity = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, color: '#00bcd4' },
    { id: 'analytics', label: 'Analytics', icon: <Timeline />, color: '#4caf50' },
    { id: 'csv', label: 'CSV Analysis', icon: <CloudSync />, color: '#e91e63' },
    { id: 'nodes', label: 'Node Analysis', icon: <AccountTree />, color: '#ff9800' },
    { id: 'threats', label: 'Threat Intel', icon: <Warning />, color: '#f44336' },
    { id: 'transactions', label: 'Transactions', icon: <Assessment />, color: '#9c27b0' },
    { id: 'system', label: 'System Status', icon: <Speed />, color: '#607d8b' },
    { id: 'alerts', label: 'Alerts', icon: <Notifications />, color: '#ff5722' },
    { id: 'search', label: 'Search', icon: <Search />, color: '#795548' },
    { id: 'settings', label: 'Settings', icon: <Settings />, color: '#546e7a' },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <MonitoringControls onNotification={showNotification} />
              </Grid>
              <Grid item xs={12}>
                <Dashboard privacyMode={privacyMode} />
              </Grid>
            </Grid>
          </Box>
        );
      case 'analytics':
        return (
          <Box>
            <RealTimeCharts />
          </Box>
        );
      case 'csv':
        return (
          <Box>
            <CSVAnalysis />
          </Box>
        );
      case 'nodes':
        return (
          <Box>
            <NodeAnalysis />
          </Box>
        );
      case 'threats':
        return (
          <Box>
            <ThreatMap />
          </Box>
        );
      case 'transactions':
        return (
          <Box>
            <TransactionTable privacyMode={privacyMode} />
          </Box>
        );
      case 'system':
        return (
          <Box>
            <SystemStatus />
          </Box>
        );
      case 'alerts':
        return (
          <Box>
            <AlertsPanel />
          </Box>
        );
      case 'search':
        return (
          <Box>
            <SearchPanel />
          </Box>
        );
      case 'settings':
        return (
          <Box>
            <SettingsPanel />
          </Box>
        );
      default:
        return <Dashboard privacyMode={privacyMode} />;
    }
  };

  return (
    <MonitoringProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0a0a0a' }}>
        {/* Sidebar */}
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          sx={{
            width: sidebarOpen ? 280 : 80,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarOpen ? 280 : 80,
              boxSizing: 'border-box',
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
              borderRight: '1px solid rgba(0,188,212,0.2)',
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
            },
          }}
        >
          {/* Logo Section */}
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid rgba(0,188,212,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ 
              bgcolor: 'primary.main', 
              width: 48, 
              height: 48,
              boxShadow: '0 0 20px rgba(0,188,212,0.3)'
            }}>
              <Shield sx={{ fontSize: 28 }} />
            </Avatar>
            {sidebarOpen && (
              <Box>
                <Typography variant="h6" sx={{ 
                  color: '#00bcd4', 
                  fontWeight: 800,
                  letterSpacing: '-0.5px'
                }}>
                  ChainGuard
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  Security Suite
                </Typography>
              </Box>
            )}
          </Box>

          {/* System Status */}
          {sidebarOpen && (
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,188,212,0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: systemStatus === 'online' ? '#4caf50' : '#f44336',
                  animation: 'pulse 2s infinite'
                }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  System {systemStatus}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label="Live" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(76,175,80,0.2)', 
                    color: '#4caf50',
                    fontSize: '0.7rem'
                  }} 
                />
                <Chip 
                  label="1.3M Nodes" 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(0,188,212,0.2)', 
                    color: '#00bcd4',
                    fontSize: '0.7rem'
                  }} 
                />
              </Box>
            </Box>
          )}

          {/* Navigation */}
          <List sx={{ flexGrow: 1, py: 2 }}>
            {navigationItems.map((item) => (
              <ListItem
                key={item.id}
                component="button"
                onClick={() => setCurrentView(item.id)}
                sx={{
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                  bgcolor: currentView === item.id ? 'rgba(0,188,212,0.1)' : 'transparent',
                  border: currentView === item.id ? '1px solid rgba(0,188,212,0.3)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: 'rgba(0,188,212,0.05)',
                    border: '1px solid rgba(0,188,212,0.2)',
                  },
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
              >
                <ListItemIcon sx={{ 
                  color: currentView === item.id ? item.color : 'rgba(255,255,255,0.6)',
                  minWidth: sidebarOpen ? 40 : 'auto',
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </ListItemIcon>
                {sidebarOpen && (
                  <ListItemText 
                    primary={item.label}
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: currentView === item.id ? '#ffffff' : 'rgba(255,255,255,0.8)',
                        fontWeight: currentView === item.id ? 600 : 400,
                        fontSize: '0.9rem'
                      }
                    }}
                  />
                )}
              </ListItem>
            ))}
          </List>

          {/* Privacy Mode Toggle */}
          {sidebarOpen && (
            <Box sx={{ p: 2, borderTop: '1px solid rgba(0,188,212,0.1)' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={privacyMode}
                    onChange={(e) => setPrivacyMode(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#00bcd4',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#00bcd4',
                      },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Privacy Mode
                  </Typography>
                }
              />
            </Box>
          )}
        </Drawer>

        {/* Main Content Area */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: '#0a0a0a'
        }}>
          {/* Top Bar */}
          <AppBar 
            position="static" 
            elevation={0}
            sx={{
              bgcolor: 'rgba(26,26,26,0.95)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0,188,212,0.1)',
            }}
          >
            <Toolbar sx={{ minHeight: '64px !important' }}>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              
              <Typography variant="h6" sx={{ 
                flexGrow: 1, 
                color: '#ffffff',
                textTransform: 'capitalize'
              }}>
                {currentView.replace(/([A-Z])/g, ' $1').trim()}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  icon={<NetworkCheck />}
                  label="Connected"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(76,175,80,0.2)',
                    color: '#4caf50',
                    border: '1px solid rgba(76,175,80,0.3)'
                  }}
                />
                <Chip
                  icon={<CloudSync />}
                  label="Synced"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(0,188,212,0.2)',
                    color: '#00bcd4',
                    border: '1px solid rgba(0,188,212,0.3)'
                  }}
                />
              </Box>
            </Toolbar>
          </AppBar>

          {/* Content Area */}
          <Box sx={{ 
            flexGrow: 1, 
            p: 3,
            overflow: 'auto',
            background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(10,10,10,0.95) 100%)'
          }}>
            {renderContent()}
          </Box>
        </Box>

        {/* Notifications */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
          }}
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