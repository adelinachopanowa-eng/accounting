import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

function generateReceiptNumber() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900000) + 100000);
  return `${yy}${mm}${seq}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerSupabase();

  // upsert customer
  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .upsert(body.customer, { onConflict: 'egn' })
    .select()
    .single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

  const total = body.items.reduce((a: number, b: any) => a + Number(b.total_price), 0);
  const receipt_number = generateReceiptNumber();

  const { data: tx, error: tErr } = await supabase
    .from('transactions')
    .insert({
      receipt_number,
      contract_number: receipt_number,
      customer_id: customer.id,
      payment_method: body.payment_method,
      bank_account: body.bank_account,
      bank_name: body.bank_name,
      bank_bic: body.bank_bic,
      total_amount: total,
      notes: body.notes,
      operator_name: body.operator_name || 'Оператор',
    })
    .select()
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

  const items = body.items.map((i: any) => ({
    transaction_id: tx.id,
    nomenclature_id: i.nomenclature_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.total_price,
  }));
  const { error: iErr } = await supabase.from('transaction_items').insert(items);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

  return NextResponse.json({ id: tx.id, receipt_number });
}

export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('transactions').select('*, customers(*), transaction_items(*, nomenclatures(*))').order('transaction_date', { ascending: false }).limit(100);
  return NextResponse.json({ data });
}
