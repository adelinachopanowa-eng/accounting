import { createServerSupabase } from '@/lib/supabase-server';
import Link from 'next/link';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function TransactionsListPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('transactions')
    .select('id, receipt_number, transaction_date, total_amount, payment_method, paid, customers(first_name, last_name, egn)')
    .order('transaction_date', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сделки</h1>
        <Link className="btn btn-primary" href="/transactions/new">Нова сделка</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b">
            <tr><th className="py-2">№ ПИС</th><th>Дата</th><th>Клиент</th><th>ЕГН</th><th>Плащане</th><th className="text-right">Сума</th><th></th></tr>
          </thead>
          <tbody>
            {(data || []).map((t: any) => (
              <tr key={t.id} className="border-b hover:bg-slate-50">
                <td className="py-2 font-medium">{t.receipt_number}</td>
                <td>{format(new Date(t.transaction_date), 'dd.MM.yyyy HH:mm')}</td>
                <td>{t.customers?.first_name} {t.customers?.last_name}</td>
                <td className="font-mono text-xs">{t.customers?.egn}</td>
                <td>{t.payment_method === 'cash' ? 'В брой' : 'По банка'}</td>
                <td className="text-right">{Number(t.total_amount).toFixed(2)} лв.</td>
                <td><Link className="text-brand-600 hover:underline" href={`/api/pdf/${t.id}`}>PDF</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
