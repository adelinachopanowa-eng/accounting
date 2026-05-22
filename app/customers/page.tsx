import { createServerSupabase } from '@/lib/supabase-server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(200);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Клиенти</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">Име</th><th>ЕГН</th><th>Документ</th><th>Град</th><th></th></tr></thead>
          <tbody>
            {(data || []).map((c: any) => (
              <tr key={c.id} className="border-b hover:bg-slate-50">
                <td className="py-2">{c.first_name} {c.middle_name} {c.last_name}</td>
                <td className="font-mono text-xs">{c.egn}</td>
                <td>{c.id_card_number}</td>
                <td>{c.city}</td>
                <td><Link className="text-brand-600 hover:underline" href={`/customers/${c.id}`}>Преглед</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
