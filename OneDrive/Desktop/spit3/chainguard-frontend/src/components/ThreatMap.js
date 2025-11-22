import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Security,
} from '@mui/icons-material';
import { useMonitoring } from '../context/MonitoringContext';

function ThreatMap() {
  const { highRiskTransactions, liveTransactions, totalFraud } = useMonitoring();

  const getThreatLevel = () => {
    if (totalFraud > 5) return { level: 'CRITICAL', color: 'error', progress: 100 };
    if (totalFraud > 2) return { level: 'HIGH', color: 'warning', progress: 75 };
    if (totalFraud > 0) return { level: 'MEDIUM', color: 'info', progress: 50 };
    return { level: 'LOW', color: 'success', progress: 25 };
  };

  const threat = getThreatLevel();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Threat Intelligence
        </Typography>

        {/* Threat Level Indicator */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current Threat Level
            </Typography>
            <Chip
              label={threat.level}
              color={threat.color}
              variant="filled"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <LinearProgress
            variant="determinate"
            value={threat.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: `${threat.color}.main`,
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Threat Summary */}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Security sx={{ fontSize: 48, color: `${threat.color}.main`, mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {threat.level} Threat Level
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalFraud} fraudulent transactions detected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {highRiskTransactions.length} high-risk transactions
          </Typography>
        </Box>

        {/* Placeholder for threat details */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'rgba(255, 68, 68, 0.1)', 
          border: '1px solid rgba(255, 68, 68, 0.3)', 
          borderRadius: 1,
          mt: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            🚨 Advanced threat analysis and real-time alerts will be displayed here
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ThreatMap;