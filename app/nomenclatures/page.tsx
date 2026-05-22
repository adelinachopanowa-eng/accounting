import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function NomenclaturesPage() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('nomenclatures').select('*').order('code');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Номенклатури</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">Код</th><th>Наименование</th><th>Код на отпадък</th><th>Мярка</th><th className="text-right">Цена</th><th>Активен</th></tr></thead>
          <tbody>
            {(data || []).map((n: any) => (
              <tr key={n.id} className="border-b"><td className="py-2 font-mono text-xs">{n.code}</td><td>{n.name}</td><td>{n.waste_code}</td><td>{n.unit}</td><td className="text-right">{Number(n.current_price).toFixed(4)} лв.</td><td>{n.active ? 'Да' : 'Не'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
