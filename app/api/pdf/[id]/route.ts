import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { renderToStream } from '@react-pdf/renderer';
import TransactionPDF from '@/components/transactions/TransactionPDF';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createServerSupabase();
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id)
    .single();

  if (!tx) return new Response('Not found', { status: 404 });

  const stream = await renderToStream(React.createElement(TransactionPDF, { transaction: tx }) as any);
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
    },
  });
}
