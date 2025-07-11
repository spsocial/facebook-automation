'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Send,
  Comment,
  Pages,
  People,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface DashboardStats {
  totalBroadcasts: number;
  scheduledBroadcasts: number;
  totalComments: number;
  repliedComments: number;
  connectedPages: number;
  teamMembers: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, organization, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user && organization) {
      fetchDashboardStats();
    }
  }, [user, organization]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/dashboard');
      setStats(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Broadcasts Sent',
      value: stats?.totalBroadcasts || 0,
      icon: <Send />,
      color: '#1877f2',
      action: () => router.push('/broadcasts'),
    },
    {
      title: 'Scheduled',
      value: stats?.scheduledBroadcasts || 0,
      icon: <Schedule />,
      color: '#ff9800',
      action: () => router.push('/broadcasts?status=scheduled'),
    },
    {
      title: 'Total Comments',
      value: stats?.totalComments || 0,
      icon: <Comment />,
      color: '#4caf50',
      action: () => router.push('/comments'),
    },
    {
      title: 'Reply Rate',
      value: stats?.totalComments
        ? `${Math.round((stats.repliedComments / stats.totalComments) * 100)}%`
        : '0%',
      icon: <TrendingUp />,
      color: '#9c27b0',
    },
    {
      title: 'Connected Pages',
      value: stats?.connectedPages || 0,
      icon: <Pages />,
      color: '#00bcd4',
      action: () => router.push('/pages'),
    },
    {
      title: 'Team Members',
      value: stats?.teamMembers || 0,
      icon: <People />,
      color: '#ff5722',
      action: () => router.push('/team'),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          สวัสดี, {user?.name}! 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {organization?.name} - {organization?.plan} Plan
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                cursor: stat.action ? 'pointer' : 'default',
                transition: 'transform 0.2s',
                '&:hover': stat.action
                  ? {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    }
                  : {},
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4">{stat.value}</Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: `${stat.color}20`,
                      borderRadius: '50%',
                      p: 2,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item>
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={() => router.push('/broadcasts/new')}
              >
                Create Broadcast
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Pages />}
                onClick={() => router.push('/pages')}
              >
                Connect Page
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Comment />}
                onClick={() => router.push('/comments')}
              >
                View Comments
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Trial/Subscription Notice */}
      {organization?.status === 'trial' && organization?.trialEndsAt && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Your trial ends on {new Date(organization.trialEndsAt).toLocaleDateString()}.{' '}
          <Button size="small" onClick={() => router.push('/billing')}>
            Upgrade Now
          </Button>
        </Alert>
      )}
    </Container>
  );
}