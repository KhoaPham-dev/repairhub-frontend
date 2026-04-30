import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';

export const metadata: Metadata = {
  title: 'RepairHub',
  description: 'Quản lý sửa chữa thiết bị âm thanh',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-dvh">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#004EAB" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="h-dvh overflow-hidden">
        <div className="max-w-md mx-auto bg-white h-dvh shadow-xl relative flex flex-col">
          <main className="flex-1 overflow-y-auto bg-[#F8F9FB]">
            <PageTransition>{children}</PageTransition>
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
