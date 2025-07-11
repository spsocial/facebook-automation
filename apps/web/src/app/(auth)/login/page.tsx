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
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithFacebook } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
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
          เข้าสู่ระบบ
        </Typography>

        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 4 }}>
            {/* Facebook Login */}
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
              เข้าสู่ระบบด้วย Facebook
            </Button>

            <Divider sx={{ my: 3 }}>หรือ</Divider>

            {/* Email Login Form */}
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
                id="email"
                label="อีเมล"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'เข้าสู่ระบบ'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link href="/signup" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    ยังไม่มีบัญชี? สมัครใช้งาน
                  </Typography>
                </Link>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          การเข้าสู่ระบบแสดงว่าคุณยอมรับ{' '}
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