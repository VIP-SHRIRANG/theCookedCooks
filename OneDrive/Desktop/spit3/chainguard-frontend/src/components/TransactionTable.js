import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search,
} from '@mui/icons-material';
import { useMonitoring } from '../context/MonitoringContext';

function TransactionTable({ privacyMode }) {
  const { liveTransactions } = useMonitoring();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = liveTransactions.filter(tx =>
    tx.TxHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.From?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.To?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    if (privacyMode) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const getRiskColor = (riskScore) => {
    if (riskScore >= 80) return 'error';
    if (riskScore >= 60) return 'warning';
    if (riskScore >= 40) return 'info';
    return 'success';
  };

  return (
    <Card 
      sx={{ 
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
        border: '1px solid rgba(0,188,212,0.2)',
        borderRadius: 3,
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              Live Transaction Feed
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time blockchain transactions with AI fraud detection
            </Typography>
          </Box>
          
          <TextField
            placeholder="Search by hash, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ 
              width: 350,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(0,188,212,0.05)',
                border: '1px solid rgba(0,188,212,0.2)',
                '&:hover': {
                  border: '1px solid rgba(0,188,212,0.4)',
                },
                '&.Mui-focused': {
                  border: '1px solid rgba(0,188,212,0.6)',
                },
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'primary.main' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {liveTransactions.length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: 10,
            px: 3,
            background: 'linear-gradient(135deg, rgba(0,188,212,0.05) 0%, rgba(0,150,136,0.05) 100%)',
            border: '2px dashed rgba(0,188,212,0.3)',
            borderRadius: 3,
            m: 3,
          }}>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              🔍
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
              No Transactions Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: 500, mx: 'auto' }}>
              Start monitoring to see live blockchain transactions appear here with real-time fraud analysis
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ 
              display: 'block',
              bgcolor: 'rgba(0,188,212,0.1)',
              px: 2,
              py: 1,
              borderRadius: 1,
              maxWidth: 400,
              mx: 'auto',
            }}>
              Transactions from Polygon mainnet • AI-powered risk scoring • Real-time processing
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ px: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      Transaction Hash
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      From Address
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      To Address
                    </TableCell>
                    <TableCell align="right" sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      Value (ETH)
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      Risk Score
                    </TableCell>
                    <TableCell align="center" sx={{ 
                      fontWeight: 700, 
                      color: 'primary.main',
                      borderBottom: '2px solid rgba(0,188,212,0.3)',
                    }}>
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedTransactions.map((tx, index) => (
                    <TableRow 
                      key={tx.TxHash || index} 
                      hover
                      sx={{
                        '&:hover': {
                          bgcolor: 'rgba(0,188,212,0.05)',
                        },
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: 500,
                            color: 'text.primary',
                          }}
                        >
                          {formatAddress(tx.TxHash)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          {formatAddress(tx.From)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            fontWeight: 500,
                            color: 'text.secondary',
                          }}
                        >
                          {formatAddress(tx.To)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="right">
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          {tx.Value ? (parseFloat(tx.Value) / 1e18).toFixed(4) : '0.0000'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          label={`${tx.risk_score || 0}%`}
                          color={getRiskColor(tx.risk_score || 0)}
                          size="medium"
                          variant="filled"
                          sx={{
                            fontWeight: 700,
                            minWidth: 60,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          }}
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          label={tx.label || 'Normal'}
                          color={tx.label === 'Fraudulent' ? 'error' : 'success'}
                          size="medium"
                          variant="outlined"
                          sx={{
                            fontWeight: 600,
                            minWidth: 80,
                            border: '2px solid',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ 
              borderTop: '1px solid rgba(0,188,212,0.1)',
              px: 3,
            }}>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredTransactions.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    color: 'text.primary',
                  },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontWeight: 500,
                  },
                }}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionTable;