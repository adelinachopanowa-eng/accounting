import Link from 'next/link';
import type { Customer } from '@/types';

export default function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">Име</th><th>ЕГН</th><th>Документ</th><th></th></tr></thead>
      <tbody>
        {customers.map(c => (
          <tr key={c.id} className="border-b"><td className="py-2">{c.first_name} {c.last_name}</td><td className="font-mono text-xs">{c.egn}</td><td>{c.id_card_number}</td><td><Link className="text-brand-600" href={`/customers/${c.id}`}>Преглед</Link></td></tr>
        ))}
      </tbody>
    </table>
  );
}
