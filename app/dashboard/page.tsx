import { createServerSupabase } from '@/lib/supabase-server';
import StatsCards from '@/components/dashboard/StatsCards';
import Charts from '@/components/dashboard/Charts';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const last30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [{ data: todayTx }, { data: monthTx }, { data: dailyTx }, { data: recent }, { data: items }] = await Promise.all([
    supabase.from('transactions').select('total_amount, transaction_items(quantity)').gte('transaction_date', todayStart),
    supabase.from('transactions').select('total_amount, transaction_items(quantity)').gte('transaction_date', monthStart),
    supabase.from('transactions').select('transaction_date, total_amount').gte('transaction_date', last30).order('transaction_date'),
    supabase.from('transactions').select('id, receipt_number, transaction_date, total_amount, customers(first_name, last_name)').order('transaction_date', { ascending: false }).limit(10),
    supabase.from('transaction_items').select('quantity, total_price, nomenclatures(name)').gte('created_at', monthStart),
  ]);

  const sum = (arr: any[] | null, k: string) => (arr || []).reduce((a, b) => a + Number(b[k] || 0), 0);
  const sumItems = (arr: any[] | null) => (arr || []).reduce((a, b) => a + (b.transaction_items || []).reduce((x: number, y: any) => x + Number(y.quantity || 0), 0), 0);

  const stats = {
    todayAmount: sum(todayTx, 'total_amount'),
    todayWeight: sumItems(todayTx),
    monthAmount: sum(monthTx, 'total_amount'),
    monthWeight: sumItems(monthTx),
  };

  const dailyMap = new Map<string, number>();
  (dailyTx || []).forEach((t: any) => {
    const k = format(new Date(t.transaction_date), 'yyyy-MM-dd');
    dailyMap.set(k, (dailyMap.get(k) || 0) + Number(t.total_amount || 0));
  });
  const daily = Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));

  const breakMap = new Map<string, number>();
  (items || []).forEach((i: any) => {
    const name = i.nomenclatures?.name || 'Други';
    breakMap.set(name, (breakMap.get(name) || 0) + Number(i.total_price || 0));
  });
  const breakdown = Array.from(breakMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Табло</h1>
        <Link href="/transactions/new" className="btn btn-primary text-sm">+ Нова сделка</Link>
      </div>
      <StatsCards stats={stats} />
      <Charts daily={daily} breakdown={breakdown} />
      <div className="card">
        <h2 className="text-base md:text-lg font-semibold mb-4">Последни сделки</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b">
              <tr><th className="py-2">№</th><th>Дата</th><th className="hidden sm:table-cell">Клиент</th><th className="text-right">Сума</th></tr>
            </thead>
            <tbody>
              {(recent || []).map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="py-2"><Link className="text-brand-600 hover:underline" href={`/api/pdf/${t.id}`}>{t.receipt_number}</Link></td>
                  <td>{format(new Date(t.transaction_date), 'dd.MM.yy HH:mm')}</td>
                  <td className="hidden sm:table-cell">{t.customers?.first_name} {t.customers?.last_name}</td>
                  <td className="text-right">{Number(t.total_amount).toFixed(2)} лв.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
