import { Button, Container, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import { Facebook, Send, Comment, Analytics } from '@mui/icons-material';
import Link from 'next/link';

const features = [
  {
    icon: <Facebook fontSize="large" />,
    title: 'เชื่อมต่อ Facebook Page',
    description: 'เชื่อมต่อและจัดการหลาย Facebook Page ในที่เดียว',
  },
  {
    icon: <Send fontSize="large" />,
    title: 'ส่ง Broadcast Messages',
    description: 'ส่งข้อความถึงผู้ติดตามทั้งหมดพร้อมกัน หรือเลือกกลุ่มเป้าหมาย',
  },
  {
    icon: <Comment fontSize="large" />,
    title: 'จัดการ Comments อัตโนมัติ',
    description: 'รวบรวม comments และส่งต่อไปยัง Messenger อัตโนมัติ',
  },
  {
    icon: <Analytics fontSize="large" />,
    title: 'วิเคราะห์ผลลัพธ์',
    description: 'ดูสถิติการส่งข้อความและการตอบกลับแบบ real-time',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '299',
    features: [
      '1 Facebook Page',
      '1,000 broadcasts/เดือน',
      '3 team members',
      'Basic analytics',
    ],
  },
  {
    name: 'Professional',
    price: '899',
    popular: true,
    features: [
      '5 Facebook Pages',
      '10,000 broadcasts/เดือน',
      '10 team members',
      'Advanced analytics',
      'API access',
    ],
  },
  {
    name: 'Enterprise',
    price: '2,499',
    features: [
      'Unlimited Pages',
      'Unlimited broadcasts',
      'Unlimited team members',
      'White label option',
      'Priority support',
    ],
  },
];

export default function Home() {
  return (
    <Box>
      {/* Hero Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                ระบบจัดการ Facebook Page แบบครบวงจร
              </Typography>
              <Typography variant="h5" gutterBottom>
                ส่ง broadcast messages และจัดการ comments อัตโนมัติ
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ bgcolor: 'white', color: 'primary.main', mr: 2 }}
                  href="/signup"
                >
                  เริ่มใช้งานฟรี 14 วัน
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ borderColor: 'white', color: 'white' }}
                  href="/demo"
                >
                  ขอดู Demo
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              {/* TODO: Add hero image */}
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom>
          คุณสมบัติหลัก
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing Section */}
      <Box sx={{ bgcolor: 'grey.100', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom>
            ราคาที่คุ้มค่า
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {plans.map((plan, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    ...(plan.popular && {
                      borderColor: 'primary.main',
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }),
                  }}
                >
                  {plan.popular && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        px: 2,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      POPULAR
                    </Box>
                  )}
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Typography variant="h3" gutterBottom>
                      ฿{plan.price}
                      <Typography component="span" variant="body1">
                        /เดือน
                      </Typography>
                    </Typography>
                    <Box sx={{ mt: 3 }}>
                      {plan.features.map((feature, i) => (
                        <Typography key={i} variant="body2" sx={{ mb: 1 }}>
                          ✓ {feature}
                        </Typography>
                      ))}
                    </Box>
                    <Button
                      variant={plan.popular ? 'contained' : 'outlined'}
                      fullWidth
                      sx={{ mt: 3 }}
                      href="/signup"
                    >
                      เริ่มใช้งาน
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            พร้อมที่จะเพิ่มประสิทธิภาพการจัดการ Facebook Page?
          </Typography>
          <Typography variant="body1" sx={{ mb: 4 }}>
            ทดลองใช้ฟรี 14 วัน ไม่ต้องใช้บัตรเครดิต
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ bgcolor: 'white', color: 'primary.main' }}
            href="/signup"
          >
            เริ่มใช้งานฟรี
          </Button>
        </Container>
      </Box>
    </Box>
  );
}