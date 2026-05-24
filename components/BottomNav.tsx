'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Settings, Plus } from 'lucide-react';

const LEFT_TABS = [
  { href: '/', label: 'Tổng quan', icon: Home },
  { href: '/orders', label: 'Đơn hàng', icon: ClipboardList },
] as const;

const RIGHT_TABS = [
  { href: '/customers', label: 'Khách hàng', icon: Users },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
] as const;

const HIDE_ON = ['/login', '/orders/new'];
const HIDE_PREFIX = ['/orders/', '/customers/'];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDE_ON.includes(pathname) || HIDE_PREFIX.some((p) => pathname.startsWith(p) && pathname !== p.slice(0, -1)))
    return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const active = isActive(href);
    return (
      <Link href={href} className="flex flex-col items-center justify-center w-16 space-y-1">
        <div className={`flex items-center justify-center w-12 h-8 rounded-full transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-text-muted'}`}>
          <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-semibold ${active ? 'text-accent' : 'text-text-muted'}`}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="shrink-0 bg-surface-alt border-t border-border-subtle rounded-t-2xl"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
    >
      <div className="flex items-center justify-between px-4 py-2 relative">
        <div className="flex w-[40%] justify-between pr-2">
          {LEFT_TABS.map((t) => <NavItem key={t.href} {...t} />)}
        </div>

        {/* Center FAB */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <Link
            href="/orders/new"
            className="w-14 h-14 bg-accent text-[#0B0B0B] rounded-[1.25rem] flex items-center justify-center shadow-[0_8px_20px_rgba(201,169,110,0.35)] border-4 border-surface-alt active:scale-95 transition-transform"
          >
            <Plus size={28} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="flex w-[40%] justify-between pl-2">
          {RIGHT_TABS.map((t) => <NavItem key={t.href} {...t} />)}
        </div>
      </div>
    </nav>
  );
}
