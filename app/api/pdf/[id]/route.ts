import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { renderToStream, Font } from '@react-pdf/renderer';
import TransactionPDF from '@/components/transactions/TransactionPDF';
import React from 'react';
import { readFileSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let fontsLoaded = false;

function ensureFonts() {
  if (fontsLoaded) return;
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  const regular = readFileSync(path.join(fontsDir, 'NotoSans-Regular.ttf'));
  const bold    = readFileSync(path.join(fontsDir, 'NotoSans-Bold.ttf'));
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: `data:font/ttf;base64,${regular.toString('base64')}`, fontWeight: 'normal' },
      { src: `data:font/ttf;base64,${bold.toString('base64')}`,    fontWeight: 'bold'   },
    ],
  });
  Font.registerHyphenationCallback((word: string) => [word]);
  fontsLoaded = true;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    ensureFonts();
  } catch (e: any) {
    return new Response(
      `Font load error: ${e?.message}\n\nMake sure the build ran with 'vercel-build' script.`,
      { status: 500 }
    );
  }

  const supabase = createServerSupabase();
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id)
    .single();

  if (error || !tx) return new Response('Not found', { status: 404 });

  const stream = await renderToStream(
    React.createElement(TransactionPDF, { transaction: tx }) as any
  );
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
