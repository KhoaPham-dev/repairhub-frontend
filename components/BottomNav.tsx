'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Tổng quan', icon: '📊' },
  { href: '/orders', label: 'Đơn hàng', icon: '📋' },
  { href: '/customers', label: 'Khách hàng', icon: '👥' },
  { href: '/staff', label: 'Nhân viên', icon: '👤' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 min-h-[56px] py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-[#1565C0]' : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
