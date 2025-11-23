import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload,
  Assessment,
  Warning,
  CheckCircle,
  Download,
  Visibility,
  Map,
  Analytics,
  Security,
  TrendingUp,
  Block,
  Flag,
} from '@mui/icons-material';

function CSVAnalysis() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [methodologyDialogOpen, setMethodologyDialogOpen] = useState(false);
  const [topFraudDialogOpen, setTopFraudDialogOpen] = useState(false);
  const [reportId, setReportId] = useState(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/csv/analyze`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setReport(data.report);
        setReportId(data.report_id);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSample = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/csv/sample');
      const data = await response.json();
      
      // Convert to CSV and download
      const csvContent = convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_transactions.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to generate sample data');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ];
    
    return csvRows.join('\n');
  };

  const handleDownloadReport = async (format = 'txt') => {
    if (!reportId) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/csv/report/${reportId}?format=${format}`);
      
      if (response.ok) {
        if (format === 'json') {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `chainguard_analysis_report_${reportId}.json`;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          const text = await response.text();
          const blob = new Blob([text], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `chainguard_analysis_report_${reportId}.txt`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } else {
        setError('Failed to download report');
      }
    } catch (err) {
      setError('Failed to download report');
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 70) return 'error';      // BLOCKED
    if (riskScore >= 65) return 'warning';    // FLAGGED
    if (riskScore >= 30) return 'info';       // SUSPICIOUS
    return 'success';                         // APPROVED
  };

  const getStatusColor = (status) => {
    if (status === 'BLOCKED') return 'error';
    if (status === 'FLAGGED') return 'warning';
    if (status === 'SUSPICIOUS') return 'info';
    return 'success';
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const paginatedResults = results ? results.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  ) : [];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 4, 
          background: 'linear-gradient(135deg, rgba(0,188,212,0.1) 0%, rgba(0,150,136,0.1) 100%)',
          border: '1px solid rgba(0,188,212,0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Assessment sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            CSV Transaction Analysis
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Upload CSV files containing blockchain transactions for comprehensive fraud analysis
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip 
            icon={<CloudUpload />} 
            label="Batch Processing" 
            color="primary" 
            variant="outlined" 
          />
          <Chip 
            icon={<Map />} 
            label="Geographic Mapping" 
            color="secondary" 
            variant="outlined" 
          />
          <Chip 
            icon={<Analytics />} 
            label="Detailed Reports" 
            color="success" 
            variant="outlined" 
          />
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Upload Section */}
        <Grid item xs={12} lg={6}>
          <Card 
            sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
              border: '1px solid rgba(0,188,212,0.2)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Upload Transaction Data
              </Typography>

              {/* File Upload */}
              <Box sx={{ 
                border: '2px dashed rgba(0,188,212,0.3)',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                mb: 3,
                bgcolor: 'rgba(0,188,212,0.05)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(0,188,212,0.5)',
                  bgcolor: 'rgba(0,188,212,0.1)',
                }
              }}>
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {file ? file.name : 'Select CSV File'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Upload a CSV file with transaction data for analysis
                </Typography>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{ mr: 2 }}
                  >
                    Choose File
                  </Button>
                </label>
                
                <Button
                  variant="text"
                  onClick={handleGenerateSample}
                  startIcon={<Download />}
                  color="secondary"
                >
                  Download Sample
                </Button>
              </Box>

              {/* Upload Button */}
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!file || uploading}
                fullWidth
                size="large"
                startIcon={<Assessment />}
                sx={{ 
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                {uploading ? 'Analyzing...' : 'Analyze Transactions'}
              </Button>

              {uploading && (
                <Box sx={{ mt: 3 }}>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Processing transactions with AI fraud detection...
                  </Typography>
                </Box>
              )}

              {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {error}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Report Summary */}
        {report && (
          <Grid item xs={12} lg={6}>
            <Card 
              sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
                border: '1px solid rgba(0,188,212,0.2)',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                  Analysis Summary
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="primary.main" sx={{ fontWeight: 800 }}>
                        {report.summary.total_transactions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Transactions
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="error.main" sx={{ fontWeight: 800 }}>
                        {report.summary.blocked}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Blocked
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="warning.main" sx={{ fontWeight: 800 }}>
                        {report.summary.flagged}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Flagged
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="success.main" sx={{ fontWeight: 800 }}>
                        {report.summary.approved}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Risk Distribution
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={`High: ${report.risk_distribution.high}`} 
                      color="error" 
                      size="small" 
                    />
                    <Chip 
                      label={`Medium: ${report.risk_distribution.medium}`} 
                      color="warning" 
                      size="small" 
                    />
                    <Chip 
                      label={`Low: ${report.risk_distribution.low}`} 
                      color="success" 
                      size="small" 
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Risk Score: {report.summary.average_risk_score}%
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setMapDialogOpen(true)}
                    startIcon={<Map />}
                    sx={{ flex: 1 }}
                  >
                    Geographic View
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setTopFraudDialogOpen(true)}
                    startIcon={<Warning />}
                    sx={{ flex: 1 }}
                    color="error"
                  >
                    Top Fraudulent
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setMethodologyDialogOpen(true)}
                    startIcon={<Analytics />}
                    fullWidth
                  >
                    Methodology
                  </Button>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Download Reports
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleDownloadReport('txt')}
                    startIcon={<Download />}
                    disabled={!reportId}
                    size="small"
                    sx={{ flex: 1 }}
                  >
                    Text Report
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handleDownloadReport('json')}
                    startIcon={<Download />}
                    disabled={!reportId}
                    size="small"
                    sx={{ flex: 1 }}
                  >
                    JSON Data
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Detailed analysis report with methodology and technical details
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Results Table */}
        {results && (
          <Grid item xs={12}>
            <Card 
              sx={{ 
                background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
                border: '1px solid rgba(0,188,212,0.2)',
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  p: 3,
                  borderBottom: '1px solid rgba(0,188,212,0.1)',
                }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      Transaction Analysis Results
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {results.length} transactions analyzed
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() => handleDownloadReport('txt')}
                      startIcon={<Download />}
                      disabled={!reportId}
                      size="small"
                    >
                      Download Report
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => handleDownloadReport('json')}
                      startIcon={<Download />}
                      disabled={!reportId}
                      size="small"
                    >
                      JSON
                    </Button>
                  </Box>
                </Box>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Transaction ID
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          From
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          To
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Amount (ETH)
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Block Height
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Error
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Risk Score
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Status
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedResults.map((tx, index) => (
                        <TableRow 
                          key={tx.transaction_id || index}
                          hover
                          sx={{
                            '&:hover': { bgcolor: 'rgba(0,188,212,0.05)' },
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                            >
                              {formatAddress(tx.transaction_id)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                            >
                              {formatAddress(tx.from_address)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                            >
                              {formatAddress(tx.to_address)}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="right">
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {(tx.amount || tx.Value || 0).toFixed(8)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ETH
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {tx.block_height?.toLocaleString() || 'N/A'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={tx.is_error ? 'ERROR' : 'OK'}
                              color={tx.is_error ? 'error' : 'success'}
                              size="small"
                              variant="filled"
                              sx={{ fontWeight: 700, minWidth: 50 }}
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={`${tx.risk_score}%`}
                              color={getRiskColor(tx.risk_score)}
                              size="medium"
                              variant="filled"
                              sx={{ fontWeight: 700, minWidth: 60 }}
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={tx.status}
                              color={getStatusColor(tx.status)}
                              size="medium"
                              variant="filled"
                              sx={{ fontWeight: 700, minWidth: 90 }}
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Tooltip title="View Details">
                                <IconButton size="small" color="primary">
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              {tx.status === 'BLOCKED' && (
                                <Tooltip title="Blocked Transaction">
                                  <IconButton size="small" color="error">
                                    <Block />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {tx.status === 'FLAGGED' && (
                                <Tooltip title="Flagged for Review">
                                  <IconButton size="small" color="warning">
                                    <Flag />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={results.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(event, newPage) => setPage(newPage)}
                  onRowsPerPageChange={(event) => {
                    setRowsPerPage(parseInt(event.target.value, 10));
                    setPage(0);
                  }}
                  sx={{
                    borderTop: '1px solid rgba(0,188,212,0.1)',
                    '& .MuiTablePagination-toolbar': { color: 'text.primary' },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Geographic Distribution Dialog */}
      <Dialog
        open={mapDialogOpen}
        onClose={() => setMapDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Map sx={{ mr: 2, color: 'primary.main' }} />
            Geographic Distribution
          </Box>
        </DialogTitle>
        <DialogContent>
          {report && (
            <Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Transaction distribution across countries with risk analysis
              </Typography>
              
              <Grid container spacing={2}>
                {Object.entries(report.geographic_distribution).map(([country, data]) => (
                  <Grid item xs={12} sm={6} md={4} key={country}>
                    <Card sx={{ p: 2, bgcolor: 'rgba(0,188,212,0.05)' }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {country}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total: {data.count} transactions
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        High Risk: {data.high_risk}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(data.high_risk / data.count) * 100}
                        color="error"
                        sx={{ mt: 1 }}
                      />
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Methodology Dialog */}
      <Dialog
        open={methodologyDialogOpen}
        onClose={() => setMethodologyDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Analytics sx={{ mr: 2, color: 'primary.main' }} />
            Fraud Detection Methodology & Technical Details
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            {/* ML Model Section */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(0,188,212,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                Machine Learning Model
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600 }}>
                    Algorithm: Isolation Forest
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Unsupervised anomaly detection that isolates anomalies by randomly selecting features and split values. 
                    Anomalies are isolated closer to the root of isolation trees.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600 }}>
                    Model Parameters
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                    <li><Typography variant="body2">Contamination Rate: 10% (realistic anomaly expectation)</Typography></li>
                    <li><Typography variant="body2">Estimators: 50 isolation trees</Typography></li>
                    <li><Typography variant="body2">Random State: 42 (reproducible results)</Typography></li>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Feature Engineering Section */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(76,175,80,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                Feature Engineering
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                The ML model uses 13 engineered features extracted from transaction data:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                    Transaction Features
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, fontSize: '0.875rem' }}>
                    <li>Amount (ETH value)</li>
                    <li>Block height (blockchain position)</li>
                    <li>Error flag (transaction success/failure)</li>
                    <li>Value logarithm (normalized amount)</li>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                    Temporal & Address Features
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, fontSize: '0.875rem' }}>
                    <li>Hour of day (timing patterns)</li>
                    <li>Day of week (temporal behavior)</li>
                    <li>Address lengths (structural analysis)</li>
                    <li>Zero counts in addresses (contract detection)</li>
                    <li>Transaction hash length</li>
                  </Box>
                </Grid>
              </Grid>
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                All features are normalized using StandardScaler before ML processing.
              </Typography>
            </Paper>

            {/* Risk Scoring Section */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(255,152,0,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ mr: 1, color: 'warning.main' }} />
                Risk Scoring Algorithm
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Final risk score combines rule-based and ML-based components (0-100%):
              </Typography>
              
              <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                Rule-Based Components
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={4}>
                  <Chip label="Large Amount (>10 ETH): +30pts" size="small" color="error" variant="outlined" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Chip label="Medium Amount (1-10 ETH): +15pts" size="small" color="warning" variant="outlined" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Chip label="Dust (<0.001 ETH): +20pts" size="small" color="info" variant="outlined" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Chip label="Transaction Error: +40pts" size="small" color="error" variant="outlined" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Chip label="Round Amount: +15pts" size="small" color="warning" variant="outlined" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Chip label="Self Transfer: +25pts" size="small" color="error" variant="outlined" />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                ML Component
              </Typography>
              <Typography variant="body2">
                • Maximum 30 points from ML anomaly detection<br/>
                • Calculation: min(30, abs(anomaly_score) × 20)<br/>
                • Triggered when Isolation Forest predicts anomaly (-1)
              </Typography>
            </Paper>

            {/* Classification Section */}
            <Paper sx={{ p: 3, bgcolor: 'rgba(244,67,54,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <Flag sx={{ mr: 1, color: 'error.main' }} />
                Classification Thresholds
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'success.main', borderRadius: 2 }}>
                    <CheckCircle sx={{ color: 'success.main', mb: 1 }} />
                    <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 600 }}>
                      APPROVED
                    </Typography>
                    <Typography variant="body2">0-29% Risk</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'info.main', borderRadius: 2 }}>
                    <Visibility sx={{ color: 'info.main', mb: 1 }} />
                    <Typography variant="subtitle2" color="info.main" sx={{ fontWeight: 600 }}>
                      SUSPICIOUS
                    </Typography>
                    <Typography variant="body2">30-64% Risk</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'warning.main', borderRadius: 2 }}>
                    <Flag sx={{ color: 'warning.main', mb: 1 }} />
                    <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>
                      FLAGGED
                    </Typography>
                    <Typography variant="body2">65-69% Risk</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}>
                    <Block sx={{ color: 'error.main', mb: 1 }} />
                    <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 600 }}>
                      BLOCKED
                    </Typography>
                    <Typography variant="body2">70-100% Risk</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMethodologyDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => handleDownloadReport('txt')}
            startIcon={<Download />}
            disabled={!reportId}
          >
            Download Full Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Top Fraudulent Transactions Dialog */}
      <Dialog
        open={topFraudDialogOpen}
        onClose={() => setTopFraudDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 2, color: 'error.main' }} />
            Top 10 Most Fraudulent Transactions
          </Box>
        </DialogTitle>
        <DialogContent>
          {results && (
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" sx={{ mb: 3 }}>
                These transactions have the highest risk scores and represent the most suspicious activity detected:
              </Typography>
              
              {results
                .sort((a, b) => b.risk_score - a.risk_score)
                .slice(0, 10)
                .map((tx, index) => (
                  <Paper 
                    key={tx.transaction_id || index} 
                    sx={{ 
                      p: 3, 
                      mb: 2, 
                      bgcolor: tx.risk_score >= 70 ? 'rgba(244,67,54,0.05)' : 
                               tx.risk_score >= 65 ? 'rgba(255,152,0,0.05)' : 'rgba(33,150,243,0.05)',
                      border: `1px solid ${tx.risk_score >= 70 ? 'rgba(244,67,54,0.3)' : 
                                          tx.risk_score >= 65 ? 'rgba(255,152,0,0.3)' : 'rgba(33,150,243,0.3)'}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        #{index + 1} - Risk Score: {tx.risk_score}%
                      </Typography>
                      <Chip
                        label={tx.status}
                        color={getStatusColor(tx.status)}
                        variant="filled"
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                          Transaction Details
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Hash:</strong> {formatAddress(tx.transaction_id)}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Amount:</strong> {(tx.amount || tx.Value || 0).toFixed(8)} ETH
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>From:</strong> {formatAddress(tx.from_address)}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>To:</strong> {formatAddress(tx.to_address)}
                        </Typography>
                        {tx.country && (
                          <Typography variant="body2">
                            <strong>Country:</strong> {tx.country}
                          </Typography>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 600, mb: 1 }}>
                          Risk Factors
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {tx.flags && tx.flags.map((flag, flagIndex) => (
                            <Chip
                              key={flagIndex}
                              label={flag}
                              size="small"
                              color={
                                flag.includes('Error') ? 'error' :
                                flag.includes('Large') ? 'warning' :
                                flag.includes('CatBoost') || flag.includes('Isolation') ? 'secondary' :
                                'default'
                              }
                              variant="outlined"
                            />
                          ))}
                        </Box>
                        
                        {tx.block_height && (
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            <strong>Block Height:</strong> {tx.block_height.toLocaleString()}
                          </Typography>
                        )}
                        
                        {tx.is_error !== undefined && (
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Transaction Status:</strong> {tx.is_error ? 'Failed' : 'Success'}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Risk Assessment:</strong> This transaction scored {tx.risk_score}% due to {tx.flags?.length || 0} risk factors. 
                        {tx.risk_score >= 70 && ' Immediate action recommended.'}
                        {tx.risk_score >= 65 && tx.risk_score < 70 && ' Manual review required.'}
                        {tx.risk_score < 65 && ' Monitor for patterns.'}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopFraudDialogOpen(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => handleDownloadReport('txt')}
            startIcon={<Download />}
            disabled={!reportId}
            color="error"
          >
            Download Full Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CSVAnalysis;