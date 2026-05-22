import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { format, startOfWeek, startOfMonth } from 'date-fns';

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') || '1900-01-01';
  const to = req.nextUrl.searchParams.get('to') || '2999-12-31';
  const groupBy = req.nextUrl.searchParams.get('groupBy') || 'nomenclature';
  const supabase = createServerSupabase();

  const { data } = await supabase
    .from('transaction_items')
    .select('quantity, total_price, created_at, nomenclatures(name), transactions(transaction_date, customers(first_name, last_name, egn))')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59');

  const map = new Map<string, { quantity: number; amount: number }>();
  (data || []).forEach((it: any) => {
    let key = '';
    const txDate = it.transactions?.transaction_date ? new Date(it.transactions.transaction_date) : new Date(it.created_at);
    if (groupBy === 'nomenclature') key = it.nomenclatures?.name || 'Други';
    else if (groupBy === 'customer') key = `${it.transactions?.customers?.first_name || ''} ${it.transactions?.customers?.last_name || ''} (${it.transactions?.customers?.egn || ''})`;
    else if (groupBy === 'day') key = format(txDate, 'yyyy-MM-dd');
    else if (groupBy === 'week') key = format(startOfWeek(txDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    else if (groupBy === 'month') key = format(startOfMonth(txDate), 'yyyy-MM');
    const cur = map.get(key) || { quantity: 0, amount: 0 };
    cur.quantity += Number(it.quantity || 0);
    cur.amount += Number(it.total_price || 0);
    map.set(key, cur);
  });

  const rows = Array.from(map.entries()).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.amount - a.amount);
  return NextResponse.json({ data: rows });
}
