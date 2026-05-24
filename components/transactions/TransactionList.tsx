import Link from 'next/link';
import { format } from 'date-fns';
import type { Transaction } from '@/types';

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">№</th><th>Дата</th><th>Клиент</th><th className="text-right">Сума (EUR)</th><th></th></tr></thead>
      <tbody>
        {transactions.map(t => (
          <tr key={t.id} className="border-b"><td className="py-2">{t.receipt_number}</td><td>{format(new Date(t.transaction_date), 'dd.MM.yyyy HH:mm')}</td><td>{t.customers?.first_name} {t.customers?.last_name}</td><td className="text-right">{Number(t.total_amount).toFixed(2)} EUR</td><td><Link className="text-brand-600" href={`/api/pdf/${t.id}`}>PDF</Link></td></tr>
        ))}
      </tbody>
    </table>
  );
}
