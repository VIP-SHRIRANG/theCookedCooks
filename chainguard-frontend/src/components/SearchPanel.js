import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search,
  AccountBalanceWallet,
  Receipt,
  Timeline,
  Security,
  ExpandMore,
  Visibility,
  Flag,
  TrendingUp,
  TrendingDown,
  FilterList,
  Clear,
  Download,
  Share,
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

function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('address');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    timeRange: '24h',
    minValue: '',
    maxValue: ''
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Mock search results based on search type
      let results = [];
      
      if (searchType === 'address') {
        // Mock address search results
        results = [
          {
            type: 'address',
            address: searchQuery,
            totalTransactions: 1247,
            fraudTransactions: 23,
            fraudPercentage: 1.8,
            riskScore: 0.65,
            totalValue: 456.78,
            firstSeen: '2024-01-15',
            lastSeen: '2024-11-22',
            category: 'Exchange',
            flagged: false
          }
        ];
      } else if (searchType === 'transaction') {
        // Mock transaction search results
        results = [
          {
            type: 'transaction',
            txHash: searchQuery,
            blockHeight: 18500000,
            timestamp: new Date().toISOString(),
            from: '0x1234567890abcdef1234567890abcdef12345678',
            to: '0xabcdef1234567890abcdef1234567890abcdef12',
            value: 1.5,
            riskScore: 75,
            label: 'Suspicious',
            action: '🔶 SUSPICIOUS - Requires Manual Review'
          }
        ];
      } else if (searchType === 'pattern') {
        // Mock pattern search results
        results = [
          {
            type: 'pattern',
            pattern: 'High frequency micro-transactions',
            addresses: [
              '0x1111111111111111111111111111111111111111',
              '0x2222222222222222222222222222222222222222',
              '0x3333333333333333333333333333333333333333'
            ],
            transactions: 156,
            timeframe: '1 hour',
            riskLevel: 'High',
            confidence: 0.89
          }
        ];
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSearchResults(results);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 80) return 'error';
    if (riskScore >= 65) return 'warning';
    return 'success';
  };

  const getRiskLabel = (riskScore) => {
    if (riskScore >= 80) return 'High Risk';
    if (riskScore >= 65) return 'Medium Risk';
    return 'Low Risk';
  };

  // Mock recent searches
  const recentSearches = [
    { query: '0x1234...5678', type: 'address', timestamp: '2 minutes ago' },
    { query: '0xabcd...efgh', type: 'address', timestamp: '5 minutes ago' },
    { query: '0x9876...5432', type: 'transaction', timestamp: '10 minutes ago' },
    { query: 'round number pattern', type: 'pattern', timestamp: '15 minutes ago' }
  ];

  // Mock saved searches
  const savedSearches = [
    { name: 'High Risk Addresses', query: 'risk_score > 0.8', type: 'advanced' },
    { name: 'Large Transactions', query: 'value > 100 ETH', type: 'advanced' },
    { name: 'Exchange Addresses', query: 'category = exchange', type: 'advanced' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
            <Search />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Advanced Search
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search addresses, transactions, and patterns across the blockchain
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search Interface */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Search Type</InputLabel>
                <Select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  label="Search Type"
                >
                  <MenuItem value="address">Address</MenuItem>
                  <MenuItem value="transaction">Transaction</MenuItem>
                  <MenuItem value="pattern">Pattern</MenuItem>
                  <MenuItem value="advanced">Advanced Query</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={
                  searchType === 'address' ? 'Enter wallet address (0x...)' :
                  searchType === 'transaction' ? 'Enter transaction hash (0x...)' :
                  searchType === 'pattern' ? 'Describe the pattern to search for' :
                  'Enter advanced query (e.g., risk_score > 0.8)'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                sx={{ height: 56 }}
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FilterList sx={{ mr: 1 }} />
                <Typography>Advanced Filters</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Risk Level</InputLabel>
                    <Select
                      value={filters.riskLevel}
                      onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
                      label="Risk Level"
                    >
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="high">High Risk (≥80%)</MenuItem>
                      <MenuItem value="medium">Medium Risk (65-79%)</MenuItem>
                      <MenuItem value="low">Low Risk (&lt;65%)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Range</InputLabel>
                    <Select
                      value={filters.timeRange}
                      onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                      label="Time Range"
                    >
                      <MenuItem value="1h">Last Hour</MenuItem>
                      <MenuItem value="24h">Last 24 Hours</MenuItem>
                      <MenuItem value="7d">Last 7 Days</MenuItem>
                      <MenuItem value="30d">Last 30 Days</MenuItem>
                      <MenuItem value="all">All Time</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Min Value (ETH)"
                    type="number"
                    value={filters.minValue}
                    onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Max Value (ETH)"
                    type="number"
                    value={filters.maxValue}
                    onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography sx={{ mt: 1, textAlign: 'center' }}>
            Searching blockchain data...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                Search Results ({searchResults.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" startIcon={<Download />}>
                  Export
                </Button>
                <Button size="small" startIcon={<Share />}>
                  Share
                </Button>
              </Box>
            </Box>

            {searchResults.map((result, index) => (
              <Paper key={index} sx={{ p: 3, mb: 2, border: '1px solid', borderColor: 'divider' }}>
                {result.type === 'address' && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AccountBalanceWallet sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Address Analysis</Typography>
                        {result.flagged && <Flag sx={{ ml: 1, color: 'error.main' }} />}
                      </Box>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                        {result.address}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">
                            Total Transactions
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {result.totalTransactions.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">
                            Fraud Rate
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {result.fraudPercentage}%
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">
                            Total Value
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {result.totalValue} ETH
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">
                            Category
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {result.category}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={getRiskLabel(result.riskScore * 100)}
                          color={getRiskColor(result.riskScore * 100)}
                          size="large"
                          sx={{ fontSize: '1rem', px: 2 }}
                        />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {(result.riskScore * 100).toFixed(0)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Risk Score
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}

                {result.type === 'transaction' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Transaction Analysis</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                      {result.txHash}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          From
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatAddress(result.from)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          To
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {formatAddress(result.to)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Value
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {result.value} ETH
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Risk Score
                        </Typography>
                        <Chip
                          label={`${result.riskScore}%`}
                          color={getRiskColor(result.riskScore)}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Action: {result.action}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {result.type === 'pattern' && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Timeline sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">Pattern Analysis</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
                      {result.pattern}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Addresses Involved
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {result.addresses.length}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Transactions
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {result.transactions}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Timeframe
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {result.timeframe}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Confidence
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {(result.confidence * 100).toFixed(0)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Button size="small" startIcon={<Visibility />}>
                    View Details
                  </Button>
                  <Button size="small" startIcon={<Flag />} color="warning">
                    Flag
                  </Button>
                </Box>
              </Paper>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sidebar with Recent and Saved Searches */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Timeline sx={{ mr: 1 }} />
                Recent Searches
              </Typography>
              <List dense>
                {recentSearches.map((search, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      button
                      onClick={() => {
                        setSearchQuery(search.query);
                        setSearchType(search.type);
                      }}
                    >
                      <ListItemText
                        primary={search.query}
                        secondary={`${search.type} • ${search.timestamp}`}
                      />
                    </ListItem>
                    {index < recentSearches.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Security sx={{ mr: 1 }} />
                Saved Searches
              </Typography>
              <List dense>
                {savedSearches.map((search, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      button
                      onClick={() => {
                        setSearchQuery(search.query);
                        setSearchType(search.type);
                      }}
                    >
                      <ListItemText
                        primary={search.name}
                        secondary={search.query}
                      />
                    </ListItem>
                    {index < savedSearches.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SearchPanel;