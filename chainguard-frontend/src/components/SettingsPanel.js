import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  Security,
  Notifications,
  Palette,
  Storage,
  NetworkCheck,
  Shield,
  Speed,
  Visibility,
  VisibilityOff,
  Save,
  Restore,
  Download,
  Upload,
  Delete,
  Edit,
  Add,
  Warning,
  CheckCircle,
} from '@mui/icons-material';

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

function SettingsPanel() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    // General Settings
    autoRefresh: true,
    refreshInterval: 30,
    privacyMode: false,
    darkMode: true,
    compactView: false,
    
    // Security Settings
    fraudThreshold: 80,
    alertThreshold: 65,
    autoBlock: false,
    requireConfirmation: true,
    sessionTimeout: 30,
    
    // Notification Settings
    emailNotifications: true,
    browserNotifications: true,
    smsAlerts: false,
    slackIntegration: false,
    webhookUrl: '',
    
    // Performance Settings
    maxTransactions: 1000,
    cacheSize: 500,
    enablePredictiveLoading: true,
    compressionEnabled: true,
    
    // API Settings
    apiKey: '',
    rpcEndpoint: 'https://polygon-rpc.com',
    backupRpcEndpoint: 'https://rpc-mainnet.matic.network',
    requestTimeout: 10,
    retryAttempts: 3,
  });

  const [saveDialog, setSaveDialog] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    localStorage.setItem('chainguard_settings', JSON.stringify(settings));
    setSaveDialog(false);
    // Show success message
  };

  const handleResetSettings = () => {
    // Reset to default values
    setSettings({
      autoRefresh: true,
      refreshInterval: 30,
      privacyMode: false,
      darkMode: true,
      compactView: false,
      fraudThreshold: 80,
      alertThreshold: 65,
      autoBlock: false,
      requireConfirmation: true,
      sessionTimeout: 30,
      emailNotifications: true,
      browserNotifications: true,
      smsAlerts: false,
      slackIntegration: false,
      webhookUrl: '',
      maxTransactions: 1000,
      cacheSize: 500,
      enablePredictiveLoading: true,
      compressionEnabled: true,
      apiKey: '',
      rpcEndpoint: 'https://polygon-rpc.com',
      backupRpcEndpoint: 'https://rpc-mainnet.matic.network',
      requestTimeout: 10,
      retryAttempts: 3,
    });
    setResetDialog(false);
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `chainguard-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setExportDialog(false);
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(importedSettings);
        } catch (error) {
          console.error('Error importing settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chainguard_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
            <Settings />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure ChainGuard security and monitoring preferences
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Restore />}
            onClick={() => setResetDialog(true)}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={() => setSaveDialog(true)}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {/* Settings Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="General" icon={<Settings />} />
          <Tab label="Security" icon={<Security />} />
          <Tab label="Notifications" icon={<Notifications />} />
          <Tab label="Performance" icon={<Speed />} />
          <Tab label="API & Network" icon={<NetworkCheck />} />
          <Tab label="Import/Export" icon={<Storage />} />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        {/* General Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Palette sx={{ mr: 1 }} />
                  Interface Settings
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Dark Mode"
                      secondary="Use dark theme for better visibility"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.darkMode}
                        onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Privacy Mode"
                      secondary="Hide sensitive information in displays"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.privacyMode}
                        onChange={(e) => handleSettingChange('privacyMode', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Compact View"
                      secondary="Show more information in less space"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.compactView}
                        onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Speed sx={{ mr: 1 }} />
                  Auto-Refresh Settings
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Auto Refresh"
                      secondary="Automatically refresh data"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.autoRefresh}
                        onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
                
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Refresh Interval: {settings.refreshInterval} seconds
                  </Typography>
                  <Slider
                    value={settings.refreshInterval}
                    onChange={(e, value) => handleSettingChange('refreshInterval', value)}
                    min={5}
                    max={300}
                    step={5}
                    marks={[
                      { value: 5, label: '5s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '1m' },
                      { value: 300, label: '5m' }
                    ]}
                    disabled={!settings.autoRefresh}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Security Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Shield sx={{ mr: 1 }} />
                  Fraud Detection
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Critical Fraud Threshold: {settings.fraudThreshold}%
                  </Typography>
                  <Slider
                    value={settings.fraudThreshold}
                    onChange={(e, value) => handleSettingChange('fraudThreshold', value)}
                    min={65}
                    max={100}
                    step={5}
                    marks={[
                      { value: 65, label: '65%' },
                      { value: 70, label: '70%' },
                      { value: 80, label: '80%' },
                      { value: 90, label: '90%' },
                      { value: 100, label: '100%' }
                    ]}
                  />
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Alert Threshold: {settings.alertThreshold}%
                  </Typography>
                  <Slider
                    value={settings.alertThreshold}
                    onChange={(e, value) => handleSettingChange('alertThreshold', value)}
                    min={10}
                    max={80}
                    step={5}
                    marks={[
                      { value: 10, label: '10%' },
                      { value: 30, label: '30%' },
                      { value: 65, label: '65%' },
                      { value: 80, label: '80%' }
                    ]}
                  />
                </Box>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Auto Block High Risk"
                      secondary="Automatically block transactions above fraud threshold"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.autoBlock}
                        onChange={(e) => handleSettingChange('autoBlock', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Require Confirmation"
                      secondary="Require manual confirmation for critical actions"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.requireConfirmation}
                        onChange={(e) => handleSettingChange('requireConfirmation', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Security sx={{ mr: 1 }} />
                  Session Security
                </Typography>
                
                <TextField
                  fullWidth
                  label="Session Timeout (minutes)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  sx={{ mb: 3 }}
                  inputProps={{ min: 5, max: 480 }}
                />
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  Sessions will automatically expire after the specified time of inactivity.
                </Alert>
                
                <Alert severity="warning">
                  Enabling auto-block will automatically prevent high-risk transactions without manual review.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Notification Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Notifications sx={{ mr: 1 }} />
                  Alert Channels
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email Notifications"
                      secondary="Receive alerts via email"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Browser Notifications"
                      secondary="Show desktop notifications"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.browserNotifications}
                        onChange={(e) => handleSettingChange('browserNotifications', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="SMS Alerts"
                      secondary="Receive critical alerts via SMS"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.smsAlerts}
                        onChange={(e) => handleSettingChange('smsAlerts', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Slack Integration"
                      secondary="Send alerts to Slack channel"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.slackIntegration}
                        onChange={(e) => handleSettingChange('slackIntegration', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <NetworkCheck sx={{ mr: 1 }} />
                  Webhook Configuration
                </Typography>
                
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={settings.webhookUrl}
                  onChange={(e) => handleSettingChange('webhookUrl', e.target.value)}
                  placeholder="https://your-webhook-endpoint.com/alerts"
                  sx={{ mb: 3 }}
                />
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  Webhooks allow you to receive real-time alerts in your own systems.
                </Alert>
                
                <Button variant="outlined" fullWidth>
                  Test Webhook
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Performance Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Speed sx={{ mr: 1 }} />
                  Data Management
                </Typography>
                
                <TextField
                  fullWidth
                  label="Max Transactions to Display"
                  type="number"
                  value={settings.maxTransactions}
                  onChange={(e) => handleSettingChange('maxTransactions', parseInt(e.target.value))}
                  sx={{ mb: 3 }}
                  inputProps={{ min: 100, max: 10000 }}
                />
                
                <TextField
                  fullWidth
                  label="Cache Size (MB)"
                  type="number"
                  value={settings.cacheSize}
                  onChange={(e) => handleSettingChange('cacheSize', parseInt(e.target.value))}
                  sx={{ mb: 3 }}
                  inputProps={{ min: 100, max: 2000 }}
                />
                
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Predictive Loading"
                      secondary="Pre-load data for better performance"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.enablePredictiveLoading}
                        onChange={(e) => handleSettingChange('enablePredictiveLoading', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Data Compression"
                      secondary="Compress data to reduce bandwidth usage"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={settings.compressionEnabled}
                        onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Storage sx={{ mr: 1 }} />
                  Storage Information
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Cache Usage
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ 
                        height: 8, 
                        bgcolor: 'grey.300', 
                        borderRadius: 4,
                        position: 'relative'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          width: '65%', 
                          bgcolor: 'primary.main', 
                          borderRadius: 4 
                        }} />
                      </Box>
                    </Box>
                    <Typography variant="body2">
                      325 / 500 MB
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Database Size
                  </Typography>
                  <Typography variant="h6">
                    2.3 GB
                  </Typography>
                </Box>
                
                <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
                  Clear Cache
                </Button>
                
                <Button variant="outlined" fullWidth color="warning">
                  Optimize Database
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {/* API & Network Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <NetworkCheck sx={{ mr: 1 }} />
                  RPC Configuration
                </Typography>
                
                <TextField
                  fullWidth
                  label="Primary RPC Endpoint"
                  value={settings.rpcEndpoint}
                  onChange={(e) => handleSettingChange('rpcEndpoint', e.target.value)}
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  label="Backup RPC Endpoint"
                  value={settings.backupRpcEndpoint}
                  onChange={(e) => handleSettingChange('backupRpcEndpoint', e.target.value)}
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  fullWidth
                  label="Request Timeout (seconds)"
                  type="number"
                  value={settings.requestTimeout}
                  onChange={(e) => handleSettingChange('requestTimeout', parseInt(e.target.value))}
                  sx={{ mb: 3 }}
                  inputProps={{ min: 1, max: 60 }}
                />
                
                <TextField
                  fullWidth
                  label="Retry Attempts"
                  type="number"
                  value={settings.retryAttempts}
                  onChange={(e) => handleSettingChange('retryAttempts', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 10 }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Security sx={{ mr: 1 }} />
                  API Security
                </Typography>
                
                <TextField
                  fullWidth
                  label="API Key"
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                  sx={{ mb: 3 }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    ),
                  }}
                />
                
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Keep your API key secure. Never share it publicly.
                </Alert>
                
                <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
                  Test Connection
                </Button>
                
                <Button variant="outlined" fullWidth color="secondary">
                  Generate New API Key
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {/* Import/Export Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Download sx={{ mr: 1 }} />
                  Export Settings
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Export your current settings to a JSON file for backup or sharing.
                </Typography>
                
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={() => setExportDialog(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Export Settings
                </Button>
                
                <Alert severity="info">
                  Exported settings will include all configuration except sensitive data like API keys.
                </Alert>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                  <Upload sx={{ mr: 1 }} />
                  Import Settings
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Import settings from a previously exported JSON file.
                </Typography>
                
                <input
                  accept=".json"
                  style={{ display: 'none' }}
                  id="import-settings-file"
                  type="file"
                  onChange={handleImportSettings}
                />
                <label htmlFor="import-settings-file">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<Upload />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Import Settings
                  </Button>
                </label>
                
                <Alert severity="warning">
                  Importing settings will overwrite your current configuration.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Save Dialog */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)}>
        <DialogTitle>Save Settings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to save these settings? This will apply all changes immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveSettings} variant="contained">
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)}>
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will reset all settings to their default values. This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to reset all settings?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetSettings} color="warning" variant="contained">
            Reset All Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will download your current settings as a JSON file.
          </Typography>
          <Alert severity="info">
            Sensitive information like API keys will be excluded from the export.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>Cancel</Button>
          <Button onClick={handleExportSettings} variant="contained">
            Download Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SettingsPanel;