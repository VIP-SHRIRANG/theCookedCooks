import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useMonitoring } from '../context/MonitoringContext';
import ThreatMap from './ThreatMap.js';

function RealTimeCharts() {
  const { liveTransactions } = useMonitoring();

  // Process data for charts
  const chartData = useMemo(() => {
    if (!liveTransactions || liveTransactions.length === 0) {
      return {
        riskTrend: [],
        riskDistribution: [],
        fraudCategories: []
      };
    }

    // Risk trend over time (last 20 transactions)
    const riskTrend = liveTransactions
      .slice(0, 20)
      .reverse()
      .map((tx, index) => ({
        index: index + 1,
        riskScore: tx.risk_score || 0,
        timestamp: new Date(tx.timestamp).toLocaleTimeString(),
      }));

    // Risk score distribution
    const riskBuckets = {
      'Blocked (80-100%)': 0,
      'Suspicious (65-79%)': 0,
      'Approved (0-64%)': 0,
    };

    liveTransactions.forEach(tx => {
      const risk = tx.risk_score || 0;
      if (risk >= 80) riskBuckets['Blocked (80-100%)']++;
      else if (risk >= 65) riskBuckets['Suspicious (65-79%)']++;
      else riskBuckets['Approved (0-64%)']++;
    });

    const riskDistribution = Object.entries(riskBuckets).map(([name, value]) => ({
      name,
      value,
      percentage: liveTransactions.length > 0 ? ((value / liveTransactions.length) * 100).toFixed(1) : 0
    }));

    // Fraud categories based on risk score (consistent with risk distribution)
    const fraudCategories = [
      {
        name: 'Approved (0-64%)',
        value: liveTransactions.filter(tx => (tx.risk_score || 0) < 65).length,
        color: '#4caf50'
      },
      {
        name: 'Suspicious (65-79%)',
        value: liveTransactions.filter(tx => (tx.risk_score || 0) >= 65 && (tx.risk_score || 0) < 80).length,
        color: '#ff9800'
      },
      {
        name: 'Blocked (80-100%)',
        value: liveTransactions.filter(tx => (tx.risk_score || 0) >= 80).length,
        color: '#f44336'
      }
    ];



    return {
      riskTrend,
      riskDistribution,
      fraudCategories
    };
  }, [liveTransactions]);

  if (!liveTransactions || liveTransactions.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Real-Time Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live transaction analysis and fraud detection insights
          </Typography>
        </Box>

        <Card sx={{
          height: 400,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
          border: '1px solid rgba(0,188,212,0.2)',
          borderRadius: 3,
        }}>
          <CardContent>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              bgcolor: 'rgba(0,188,212,0.05)',
              borderRadius: 2,
              border: '2px dashed rgba(0,188,212,0.3)'
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                  📊
                </Typography>
                <Typography variant="h6" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
                  Waiting for Transaction Data
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{
                  mb: 2,
                  maxWidth: 500,
                  mx: 'auto'
                }}>
                  Charts will appear once transactions are processed and analyzed by the fraud detection system
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
                  Real-time analytics • Risk scoring • Fraud detection patterns
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Real-Time Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live transaction analysis and fraud detection insights
        </Typography>
      </Box>

      {/* Three Charts Grid - All in Same Row */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 4,
        flexWrap: 'nowrap',
        overflow: 'auto'
      }}>
        {/* Risk Score Trend */}
        <Box sx={{ flex: '1 1 0', minWidth: 250 }}>
          <Card sx={{
            height: 400,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
            border: '1px solid rgba(0,188,212,0.2)',
            borderRadius: 3,
          }}>
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                mb: 2,
                color: 'primary.main'
              }}>
                Risk Score Trend
              </Typography>
              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.riskTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="index" stroke="#ffffff" fontSize={12} />
                    <YAxis stroke="#ffffff" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #00bcd4',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                      formatter={(value) => [`${value}%`, 'Risk Score']}
                    />
                    <Line 
                      type="monotone"
                      dataKey="riskScore"
                      stroke="#00bcd4"
                      strokeWidth={3}
                      dot={{ fill: '#00bcd4', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#00bcd4', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Risk Distribution */}
        <Box sx={{ flex: '1 1 0', minWidth: 250 }}>
          <Card sx={{
            height: 400,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
            border: '1px solid rgba(0,188,212,0.2)',
            borderRadius: 3,
          }}>
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                mb: 2,
                color: 'primary.main'
              }}>
                Risk Score Distribution
              </Typography>
              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.riskDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="name"
                      stroke="#ffffff"
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#ffffff" fontSize={12} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #00bcd4',
                        borderRadius: '8px',
                        color: '#ffffff'
                      }}
                      formatter={(value) => [value, 'Count']}
                    />
                    <Bar dataKey="value" fill="#00bcd4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Statistics and Threat Intelligence Section */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Real-Time Statistics - 2x2 Grid */}
        <Box sx={{
          flex: '1 1 400px',
          minWidth: 400,
          maxWidth: { xs: '100%', lg: 'calc(60% - 12px)' }
        }}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(26,26,26,0.9) 100%)',
            border: '1px solid rgba(0,188,212,0.2)',
            borderRadius: 3,
            height: '100%'
          }}>
            <CardContent>
              <Typography variant="h4" sx={{
                fontWeight: 700,
                mb: 1,
                color: 'primary.main'
              }}>
                Real-Time Statistics
              </Typography>
              <Grid container spacing={3}>
                {/* Top Row */}
                <Grid item xs={6}>
                  <Box sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,188,212,0.1)',
                    border: '1px solid rgba(0,188,212,0.2)',
                    height: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 700,
                      color: 'primary.main',
                      mb: 1,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {liveTransactions.length}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Total Transactions
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'rgba(244,67,54,0.1)',
                    border: '1px solid rgba(244,67,54,0.2)',
                    height: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 700,
                      color: 'error.main',
                      mb: 1,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {chartData.fraudCategories.find(c => c.name === 'Blocked (80-100%)')?.value || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Blocked
                    </Typography>
                  </Box>
                </Grid>

                {/* Bottom Row */}
                <Grid item xs={6}>
                  <Box sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,152,0,0.1)',
                    border: '1px solid rgba(255,152,0,0.2)',
                    height: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 700,
                      color: 'warning.main',
                      mb: 1,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {chartData.fraudCategories.find(c => c.name === 'Suspicious (65-79%)')?.value || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Suspicious
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6}>
                  <Box sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 3,
                    bgcolor: 'rgba(33,150,243,0.1)',
                    border: '1px solid rgba(33,150,243,0.2)',
                    height: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h2" sx={{
                      fontWeight: 700,
                      color: 'info.main',
                      mb: 1,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {(liveTransactions.reduce((sum, tx) => sum + (tx.risk_score || 0), 0) / liveTransactions.length).toFixed(1)}%
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Average Risk Score
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
        <ThreatMap />
      </Box>
    </Box>
  );
}

export default RealTimeCharts;