import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Avatar,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  AccountTree,
  Flag,
  Security,
  Warning,
  CheckCircle,
  Search,
  Refresh,
  TrendingUp,
  TrendingDown,
  Block,
  Visibility,
  VisibilityOff,
  Analytics,
} from '@mui/icons-material';
import axios from 'axios';

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

function NodeAnalysis() {
  const [nodes, setNodes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [flagDialog, setFlagDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const fetchNodeAnalysis = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/nodes/analysis');
      setNodes(response.data.nodes || []);
      setStats(response.data.stats || {});
      setError(null);
    } catch (err) {
      setError('Failed to fetch node analysis data');
      console.error('Error fetching node analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodeAnalysis();
    const interval = setInterval(fetchNodeAnalysis, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleFlagNode = async (address, flagged) => {
    try {
      await axios.post(`/api/nodes/${address}/flag`, { flagged });
      await fetchNodeAnalysis(); // Refresh data
      setFlagDialog(false);
    } catch (err) {
      setError('Failed to flag node');
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 0.8) return 'error';
    if (riskScore >= 0.5) return 'warning';
    return 'success';
  };

  const getRiskLabel = (riskScore) => {
    if (riskScore >= 0.8) return 'High Risk';
    if (riskScore >= 0.5) return 'Medium Risk';
    return 'Low Risk';
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = !searchTerm || 
      node.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFlag = !showFlaggedOnly || node.is_flagged;
    return matchesSearch && matchesFlag;
  });

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value?.toFixed(2) || '0';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
          Node Analysis
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading node analysis data...
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
            <AccountTree />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Node Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comprehensive blockchain address analysis and risk assessment
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchNodeAnalysis}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.05) 100%)',
            border: '1px solid rgba(0,188,212,0.2)'
          }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Total Nodes
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {formatValue(stats.totalNodes || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(244,67,54,0.1) 0%, rgba(211,47,47,0.05) 100%)',
            border: '1px solid rgba(244,67,54,0.2)'
          }}>
            <CardContent>
              <Typography variant="h6" color="error">
                Flagged Nodes
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {formatValue(stats.flaggedNodes || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(245,124,0,0.05) 100%)',
            border: '1px solid rgba(255,152,0,0.2)'
          }}>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Avg Risk Score
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {((stats.avgRiskScore || 0) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(56,142,60,0.05) 100%)',
            border: '1px solid rgba(76,175,80,0.2)'
          }}>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Total Value
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {formatValue(stats.totalFraudValue || 0)} ETH
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="All Nodes" />
          <Tab label="High Risk" />
          <Tab label="Flagged" />
          <Tab label="Analytics" />
        </Tabs>
      </Paper>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField
          placeholder="Search by address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ minWidth: 300 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showFlaggedOnly}
              onChange={(e) => setShowFlaggedOnly(e.target.checked)}
            />
          }
          label="Show flagged only"
        />
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Node Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Transactions</TableCell>
                <TableCell align="right">Fraud Rate</TableCell>
                <TableCell align="right">Risk Score</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNodes.slice(0, 50).map((node) => (
                <TableRow key={node.address} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatAddress(node.address)}
                      </Typography>
                      {node.is_flagged && (
                        <Flag sx={{ ml: 1, color: 'error.main', fontSize: 16 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {formatValue(node.total_transactions)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {node.fraud_percentage >= 50 ? (
                        <TrendingUp sx={{ color: 'error.main', mr: 0.5, fontSize: 16 }} />
                      ) : (
                        <TrendingDown sx={{ color: 'success.main', mr: 0.5, fontSize: 16 }} />
                      )}
                      {node.fraud_percentage?.toFixed(1)}%
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${(node.risk_score * 100).toFixed(0)}%`}
                      color={getRiskColor(node.risk_score)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatValue(node.total_value)} ETH
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={getRiskLabel(node.risk_score)}
                      color={getRiskColor(node.risk_score)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={node.is_flagged ? "Unflag node" : "Flag node"}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedNode(node);
                          setFlagDialog(true);
                        }}
                        color={node.is_flagged ? "error" : "default"}
                      >
                        <Flag />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View details">
                      <IconButton size="small">
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" sx={{ mb: 2 }}>High Risk Nodes (Risk Score ≥ 80%)</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Risk Score</TableCell>
                <TableCell align="right">Fraud Transactions</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNodes
                .filter(node => node.risk_score >= 0.8)
                .slice(0, 20)
                .map((node) => (
                  <TableRow key={node.address} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatAddress(node.address)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${(node.risk_score * 100).toFixed(0)}%`}
                        color="error"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {node.fraud_transactions}
                    </TableCell>
                    <TableCell align="right">
                      {formatValue(node.total_value)} ETH
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Block />}
                        onClick={() => handleFlagNode(node.address, true)}
                      >
                        Block
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" sx={{ mb: 2 }}>Flagged Nodes</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Risk Score</TableCell>
                <TableCell align="right">Fraud Rate</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredNodes
                .filter(node => node.is_flagged)
                .map((node) => (
                  <TableRow key={node.address} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatAddress(node.address)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${(node.risk_score * 100).toFixed(0)}%`}
                        color={getRiskColor(node.risk_score)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {node.fraud_percentage?.toFixed(1)}%
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleFlagNode(node.address, false)}
                      >
                        Unflag
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" sx={{ mb: 2 }}>Node Analytics</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Risk Distribution
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    High Risk (≥80%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(filteredNodes.filter(n => n.risk_score >= 0.8).length / filteredNodes.length) * 100}
                    color="error"
                    sx={{ mb: 1 }}
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Medium Risk (50-79%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(filteredNodes.filter(n => n.risk_score >= 0.5 && n.risk_score < 0.8).length / filteredNodes.length) * 100}
                    color="warning"
                    sx={{ mb: 1 }}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Low Risk (&lt;50%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(filteredNodes.filter(n => n.risk_score < 0.5).length / filteredNodes.length) * 100}
                    color="success"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Top Risk Factors
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip label="High transaction frequency" color="error" variant="outlined" />
                  <Chip label="Unusual value patterns" color="warning" variant="outlined" />
                  <Chip label="Multiple flagged counterparties" color="error" variant="outlined" />
                  <Chip label="Suspicious timing patterns" color="warning" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Flag Dialog */}
      <Dialog open={flagDialog} onClose={() => setFlagDialog(false)}>
        <DialogTitle>
          {selectedNode?.is_flagged ? 'Unflag Node' : 'Flag Node'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {selectedNode?.is_flagged ? 'unflag' : 'flag'} this node?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Address: {selectedNode?.address}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagDialog(false)}>Cancel</Button>
          <Button
            onClick={() => handleFlagNode(selectedNode?.address, !selectedNode?.is_flagged)}
            color={selectedNode?.is_flagged ? "primary" : "error"}
            variant="contained"
          >
            {selectedNode?.is_flagged ? 'Unflag' : 'Flag'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default NodeAnalysis;