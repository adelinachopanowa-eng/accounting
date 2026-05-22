import { createServerSupabase } from '@/lib/supabase-server';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabase();
  const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();
  const { data: tx } = await supabase.from('transactions').select('id, receipt_number, transaction_date, total_amount').eq('customer_id', id).order('transaction_date', { ascending: false });
  if (!customer) return <div>Клиентът не е намерен</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{customer.first_name} {customer.middle_name} {customer.last_name}</h1>
      <div className="card grid grid-cols-3 gap-4 text-sm">
        <div><b>ЕГН:</b> {customer.egn}</div>
        <div><b>Документ:</b> {customer.id_card_number}</div>
        <div><b>Издаден от:</b> {customer.id_card_issued_by}</div>
        <div><b>Адрес:</b> {customer.address}</div>
        <div><b>Град:</b> {customer.city}</div>
        <div><b>Община:</b> {customer.municipality}</div>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Сделки</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">№</th><th>Дата</th><th className="text-right">Сума</th><th></th></tr></thead>
          <tbody>
            {(tx || []).map((t: any) => (
              <tr key={t.id} className="border-b"><td className="py-2">{t.receipt_number}</td><td>{format(new Date(t.transaction_date), 'dd.MM.yyyy')}</td><td className="text-right">{Number(t.total_amount).toFixed(2)} лв.</td><td><Link className="text-brand-600" href={`/api/pdf/${t.id}`}>PDF</Link></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
