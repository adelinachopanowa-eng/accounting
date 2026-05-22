'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Users, Package, FileBarChart, PlusCircle } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Табло', icon: LayoutDashboard },
  { href: '/transactions/new', label: 'Нова сделка', icon: PlusCircle },
  { href: '/transactions', label: 'Сделки', icon: Receipt },
  { href: '/customers', label: 'Клиенти', icon: Users },
  { href: '/nomenclatures', label: 'Номенклатури', icon: Package },
  { href: '/reports', label: 'Справки', icon: FileBarChart },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="font-bold text-lg">Прогрестрейд ЕООД</div>
        <div className="text-xs text-slate-400 mt-1">Вторични суровини</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(it => {
          const Active = pathname?.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm ${Active ? 'bg-brand-600' : 'hover:bg-slate-800'}`}>
              <Icon size={18} />{it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-slate-500 border-t border-slate-800">v1.0 - 2026</div>
    </aside>
  );
}
