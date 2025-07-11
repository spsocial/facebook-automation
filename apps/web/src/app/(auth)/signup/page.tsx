'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Facebook } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { loginWithFacebook } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/signup', formData);
      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem('token', token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'สมัครใช้งานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 3 }}>
          สมัครใช้งาน
        </Typography>

        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            {/* Facebook Signup */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<Facebook />}
              onClick={loginWithFacebook}
              sx={{
                bgcolor: '#1877f2',
                '&:hover': {
                  bgcolor: '#1565c0',
                },
                mb: 3,
              }}
            >
              สมัครด้วย Facebook
            </Button>

            <Divider sx={{ my: 3 }}>หรือ</Divider>

            {/* Signup Form */}
            <Box component="form" onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="ชื่อ-นามสกุล"
                name="name"
                autoComplete="name"
                autoFocus
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="organizationName"
                label="ชื่อบริษัท/องค์กร"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                disabled={loading}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="อีเมล"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="รหัสผ่าน"
                type="password"
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                helperText="อย่างน้อย 6 ตัวอักษร"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'สมัครใช้งาน'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link href="/login" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
                  </Typography>
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          การสมัครใช้งานแสดงว่าคุณยอมรับ{' '}
          <Link href="/terms" style={{ color: 'inherit' }}>
            ข้อกำหนดการใช้งาน
          </Link>{' '}
          และ{' '}
          <Link href="/privacy" style={{ color: 'inherit' }}>
            นโยบายความเป็นส่วนตัว
          </Link>
        </Typography>
      </Box>
    </Container>
  );
}