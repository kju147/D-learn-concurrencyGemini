import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '并发进阶之路 · Java 并发学习系统',
  description: '从并发直觉到生产实践，面向 JDK 21 的交互式 Java 并发学习系统。',
  openGraph: {
    title: '并发进阶之路',
    description: '从并发直觉到生产实践 · 面向 JDK 21',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '并发进阶之路' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '并发进阶之路',
    description: '从并发直觉到生产实践 · 面向 JDK 21',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body></html>;
}
