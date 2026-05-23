import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { renderToStream, Font } from '@react-pdf/renderer';
import TransactionPDF from '@/components/transactions/TransactionPDF';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FONT_REGULAR = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Regular.ttf';
const FONT_BOLD    = 'https://raw.githubusercontent.com/google/fonts/main/apache/roboto/static/Roboto-Bold.ttf';

let fontsLoaded = false;

async function ensureFonts() {
  if (fontsLoaded) return;
  const [r, b] = await Promise.all([
    fetch(FONT_REGULAR).then(res => res.arrayBuffer()),
    fetch(FONT_BOLD).then(res => res.arrayBuffer()),
  ]);
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: `data:font/ttf;base64,${Buffer.from(r).toString('base64')}`, fontWeight: 'normal' },
      { src: `data:font/ttf;base64,${Buffer.from(b).toString('base64')}`, fontWeight: 'bold' },
    ],
  });
  fontsLoaded = true;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createServerSupabase();
  const { data: tx } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id)
    .single();

  if (!tx) return new Response('Not found', { status: 404 });

  await ensureFonts();

  const stream = await renderToStream(React.createElement(TransactionPDF, { transaction: tx }) as any);
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
    },
  });
}
