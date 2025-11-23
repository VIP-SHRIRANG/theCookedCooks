import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Avatar,
  Paper,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Badge,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Notifications,
  Warning,
  Error,
  Info,
  Security,
  Block,
  Flag,
  CheckCircle,
  Clear,
  Settings,
  Add,
  Delete,
  Edit,
  NotificationsActive,
  NotificationsOff,
  HighlightOff,
} from '@mui/icons-material';
import { useMonitoring } from '../context/MonitoringContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function AlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [newRuleDialog, setNewRuleDialog] = useState(false);
  const [alertDetailsDialog, setAlertDetailsDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [newRule, setNewRule] = useState({
    name: '',
    type: 'fraud_threshold',
    threshold: 80,
    enabled: true,
    description: ''
  });

  const { highRiskTransactions } = useMonitoring();

  // Generate mock alerts based on high-risk transactions
  useEffect(() => {
    const generateAlerts = () => {
      const mockAlerts = [
        {
          id: 1,
          type: 'critical',
          title: 'High-Risk Transaction Detected',
          message: 'Transaction with 95% fraud probability detected',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'active',
          severity: 'error',
          source: 'ML Detection Engine',
          details: {
            txHash: '0x1234...5678',
            riskScore: 95,
            amount: '150 ETH',
            from: '0xabcd...efgh',
            to: '0x9876...5432'
          }
        },
        {
          id: 2,
          type: 'warning',
          title: 'Suspicious Address Pattern',
          message: 'Address showing unusual transaction patterns',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'acknowledged',
          severity: 'warning',
          source: 'Pattern Analysis',
          details: {
            address: '0xdef0...1234',
            pattern: 'High frequency micro-transactions',
            count: 47,
            timeframe: '10 minutes'
          }
        },
        {
          id: 3,
          type: 'info',
          title: 'Model Retrained Successfully',
          message: 'Fraud detection model updated with new data',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'resolved',
          severity: 'info',
          source: 'System',
          details: {
            version: '2.1.1',
            accuracy: '89.2%',
            samples: 50000
          }
        },
        {
          id: 4,
          type: 'critical',
          title: 'Multiple High-Risk Transactions',
          message: 'Cluster of suspicious transactions detected',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'active',
          severity: 'error',
          source: 'Cluster Analysis',
          details: {
            count: 12,
            totalValue: '2,450 ETH',
            addresses: 8,
            timeframe: '5 minutes'
          }
        },
        {
          id: 5,
          type: 'warning',
          title: 'System Performance Alert',
          message: 'Processing latency above normal threshold',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          status: 'acknowledged',
          severity: 'warning',
          source: 'System Monitor',
          details: {
            latency: '2.3s',
            threshold: '1.0s',
            queue_size: 1247
          }
        }
      ];

      // Add alerts from high-risk transactions
      if (highRiskTransactions && highRiskTransactions.length > 0) {
        const recentHighRisk = highRiskTransactions.slice(0, 3).map((tx, index) => ({
          id: `hr_${index}`,
          type: 'critical',
          title: 'Critical Fraud Alert',
          message: `Transaction flagged with ${tx.risk_score}% fraud probability`,
          timestamp: new Date(tx.timestamp || Date.now()),
          status: 'active',
          severity: 'error',
          source: 'Real-time Monitor',
          details: {
            txHash: tx.TxHash,
            riskScore: tx.risk_score,
            amount: `${(tx.Value / 1e18).toFixed(4)} ETH`,
            from: tx.From,
            to: tx.To,
            action: tx.action
          }
        }));
        mockAlerts.unshift(...recentHighRisk);
      }

      setAlerts(mockAlerts);
    };

    generateAlerts();
    const interval = setInterval(generateAlerts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [highRiskTransactions]);

  // Mock alert rules
  useEffect(() => {
    setAlertRules([
      {
        id: 1,
        name: 'High Fraud Probability',
        type: 'fraud_threshold',
        threshold: 80,
        enabled: true,
        description: 'Alert when fraud probability exceeds 80%',
        triggers: 156
      },
      {
        id: 2,
        name: 'Large Transaction Value',
        type: 'value_threshold',
        threshold: 100,
        enabled: true,
        description: 'Alert for transactions above 100 ETH',
        triggers: 23
      },
      {
        id: 3,
        name: 'Rapid Transaction Sequence',
        type: 'frequency_threshold',
        threshold: 10,
        enabled: false,
        description: 'Alert for more than 10 transactions per minute from same address',
        triggers: 8
      },
      {
        id: 4,
        name: 'System Performance',
        type: 'system_threshold',
        threshold: 90,
        enabled: true,
        description: 'Alert when system resources exceed 90%',
        triggers: 4
      }
    ]);
  }, []);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Notifications />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleAcknowledgeAlert = (alertId) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' }
        : alert
    ));
  };

  const handleResolveAlert = (alertId) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' }
        : alert
    ));
  };

  const handleDeleteAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const handleCreateRule = () => {
    const rule = {
      ...newRule,
      id: Date.now(),
      triggers: 0
    };
    setAlertRules([...alertRules, rule]);
    setNewRuleDialog(false);
    setNewRule({
      name: '',
      type: 'fraud_threshold',
      threshold: 80,
      enabled: true,
      description: ''
    });
  };

  const handleToggleRule = (ruleId) => {
    setAlertRules(alertRules.map(rule =>
      rule.id === ruleId
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const activeAlerts = alerts.filter(alert => alert.status === 'active');
  const acknowledgedAlerts = alerts.filter(alert => alert.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(alert => alert.status === 'resolved');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
            <Badge badgeContent={activeAlerts.length} color="error">
              <Notifications />
            </Badge>
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Security Alerts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time security alerts and notification management
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setNewRuleDialog(true)}
        >
          New Rule
        </Button>
      </Box>

      {/* Alert Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(244,67,54,0.1) 0%, rgba(211,47,47,0.05) 100%)',
            border: '1px solid rgba(244,67,54,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                    {activeAlerts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Alerts
                  </Typography>
                </Box>
                <Error sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(245,124,0,0.05) 100%)',
            border: '1px solid rgba(255,152,0,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {acknowledgedAlerts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Acknowledged
                  </Typography>
                </Box>
                <Warning sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(56,142,60,0.05) 100%)',
            border: '1px solid rgba(76,175,80,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {resolvedAlerts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resolved
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.05) 100%)',
            border: '1px solid rgba(0,188,212,0.2)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {alertRules.filter(rule => rule.enabled).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Rules
                  </Typography>
                </Box>
                <Settings sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            label={
              <Badge badgeContent={activeAlerts.length} color="error">
                Active Alerts
              </Badge>
            } 
          />
          <Tab label="All Alerts" />
          <Tab label="Alert Rules" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {/* Active Alerts */}
        {activeAlerts.length > 0 ? (
          <List>
            {activeAlerts.map((alert) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  sx={{
                    bgcolor: 'rgba(244,67,54,0.05)',
                    border: '1px solid rgba(244,67,54,0.2)',
                    borderRadius: 2,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    {getSeverityIcon(alert.severity)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {alert.title}
                        </Typography>
                        <Chip
                          label={alert.type}
                          size="small"
                          color={getSeverityColor(alert.severity)}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {alert.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alert.timestamp.toLocaleString()} • {alert.source}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setAlertDetailsDialog(true);
                          }}
                        >
                          <Info />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Acknowledge">
                        <IconButton
                          size="small"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          color="warning"
                        >
                          <Flag />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Resolve">
                        <IconButton
                          size="small"
                          onClick={() => handleResolveAlert(alert.id)}
                          color="success"
                        >
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dismiss">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAlert(alert.id)}
                          color="error"
                        >
                          <Clear />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="success">
            No active alerts. Your system is running smoothly!
          </Alert>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* All Alerts */}
        <List>
          {alerts.map((alert) => (
            <ListItem key={alert.id} divider>
              <ListItemIcon>
                {getSeverityIcon(alert.severity)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">
                      {alert.title}
                    </Typography>
                    <Chip
                      label={alert.status}
                      size="small"
                      color={getStatusColor(alert.status)}
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.timestamp.toLocaleString()}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedAlert(alert);
                    setAlertDetailsDialog(true);
                  }}
                >
                  <Info />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Alert Rules */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Alert Rules Configuration
          </Typography>
          <List>
            {alertRules.map((rule) => (
              <ListItem key={rule.id} divider>
                <ListItemIcon>
                  {rule.enabled ? (
                    <NotificationsActive color="primary" />
                  ) : (
                    <NotificationsOff color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={rule.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {rule.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Threshold: {rule.threshold} • Triggered: {rule.triggers} times
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={rule.enabled ? 'Enabled' : 'Disabled'}
                      color={rule.enabled ? 'success' : 'default'}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleToggleRule(rule.id)}
                    >
                      {rule.enabled ? <NotificationsOff /> : <NotificationsActive />}
                    </IconButton>
                    <IconButton size="small">
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Settings */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Alert Settings
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Notification Preferences
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Email Notifications" />
                    <ListItemSecondaryAction>
                      <IconButton>
                        <NotificationsActive />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Browser Notifications" />
                    <ListItemSecondaryAction>
                      <IconButton>
                        <NotificationsActive />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="SMS Alerts" />
                    <ListItemSecondaryAction>
                      <IconButton>
                        <NotificationsOff />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Alert Retention
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure how long alerts are kept in the system
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Active Alerts" 
                      secondary="Keep until resolved"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Resolved Alerts" 
                      secondary="Keep for 30 days"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="System Alerts" 
                      secondary="Keep for 7 days"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* New Rule Dialog */}
      <Dialog open={newRuleDialog} onClose={() => setNewRuleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Alert Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Rule Name"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Rule Type</InputLabel>
              <Select
                value={newRule.type}
                onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
              >
                <MenuItem value="fraud_threshold">Fraud Threshold</MenuItem>
                <MenuItem value="value_threshold">Value Threshold</MenuItem>
                <MenuItem value="frequency_threshold">Frequency Threshold</MenuItem>
                <MenuItem value="system_threshold">System Threshold</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Threshold"
              type="number"
              value={newRule.threshold}
              onChange={(e) => setNewRule({ ...newRule, threshold: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Description"
              value={newRule.description}
              onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewRuleDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRule} variant="contained">
            Create Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Details Dialog */}
      <Dialog 
        open={alertDetailsDialog} 
        onClose={() => setAlertDetailsDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Alert Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedAlert.type}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Severity
                  </Typography>
                  <Chip
                    label={selectedAlert.severity}
                    color={getSeverityColor(selectedAlert.severity)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedAlert.status}
                    color={getStatusColor(selectedAlert.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source
                  </Typography>
                  <Typography variant="body1">
                    {selectedAlert.source}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alert Details
              </Typography>
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {JSON.stringify(selectedAlert.details, null, 2)}
                </pre>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDetailsDialog(false)}>Close</Button>
          {selectedAlert?.status === 'active' && (
            <>
              <Button 
                onClick={() => {
                  handleAcknowledgeAlert(selectedAlert.id);
                  setAlertDetailsDialog(false);
                }}
                color="warning"
              >
                Acknowledge
              </Button>
              <Button 
                onClick={() => {
                  handleResolveAlert(selectedAlert.id);
                  setAlertDetailsDialog(false);
                }}
                color="success"
                variant="contained"
              >
                Resolve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AlertsPanel;