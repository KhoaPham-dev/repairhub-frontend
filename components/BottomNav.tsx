'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, User, Plus } from 'lucide-react';

const HIDE_ON = ['/login', '/orders/new'];

const navLeft = [
  { href: '/', label: 'Tổng quan', icon: Home },
  { href: '/orders', label: 'Đơn hàng', icon: ClipboardList },
];

const navRight = [
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/staff', label: 'Nhân viên', icon: User },
];

function isDetailRoute(pathname: string) {
  return (
    HIDE_ON.includes(pathname) ||
    /^\/orders\/.+/.test(pathname) ||
    /^\/customers\/.+/.test(pathname) ||
    pathname.startsWith('/settings')
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  if (isDetailRoute(pathname)) return null;

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return (
      <Link href={href} className="flex flex-col items-center justify-center w-16 space-y-1">
        <div className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${isActive ? 'bg-[#715DF2]/10 text-[#715DF2]' : 'text-slate-400'}`}>
          <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-semibold ${isActive ? 'text-[#715DF2]' : 'text-slate-400'}`}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 z-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-4 py-2 relative">
        <div className="flex w-[40%] justify-between pr-2">
          {navLeft.map((item) => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <Link
            href="/orders/new"
            className="w-14 h-14 bg-[#715DF2] text-white rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_20px_rgba(113,93,242,0.4)] transition-transform active:scale-95 border-4 border-white"
          >
            <Plus size={28} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="flex w-[40%] justify-between pl-2">
          {navRight.map((item) => <NavItem key={item.href} {...item} />)}
        </div>
      </div>
    </nav>
  );
}
