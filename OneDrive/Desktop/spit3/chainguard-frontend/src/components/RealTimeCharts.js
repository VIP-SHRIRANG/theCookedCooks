import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
} from '@mui/material';
import { useMonitoring } from '../context/MonitoringContext';

function RealTimeCharts() {
  const { fraudHistory, liveTransactions } = useMonitoring();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card sx={{ height: 400 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Real-Time Analytics
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: 300,
              bgcolor: 'rgba(0, 212, 255, 0.1)',
              borderRadius: 2,
              border: '1px dashed #00d4ff'
            }}>
              <Typography variant="h6" color="primary">
                📊 Charts Coming Soon
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Fraud trends, risk distribution, and volume analysis will be displayed here.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default RealTimeCharts;