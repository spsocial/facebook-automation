import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Facebook Broadcast SaaS - ระบบส่งข้อความอัตโนมัติ',
  description: 'ระบบจัดการ Facebook Page แบบครบวงจร ส่งข้อความ broadcast และจัดการ comment อัตโนมัติ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}