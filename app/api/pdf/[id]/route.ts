import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { renderToStream, Font } from '@react-pdf/renderer';
import TransactionPDF from '@/components/transactions/TransactionPDF';
import React from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// jsDelivr proxies github raw content reliably from Vercel.
// NotoSans contains full Latin + Cyrillic glyph coverage.
const FONT_REGULAR_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const FONT_BOLD_URL    = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

let fontsLoaded = false;

async function fetchTtf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // TTF magic bytes: 00 01 00 00 or 'OTTO' or 'true'
  const m = buf.subarray(0, 4).toString('hex');
  if (m !== '00010000' && buf.subarray(0,4).toString() !== 'OTTO' && buf.subarray(0,4).toString() !== 'true') {
    throw new Error(`Not a TTF: ${url} (magic=${m}, size=${buf.length})`);
  }
  return buf;
}

async function ensureFonts() {
  if (fontsLoaded) return;
  const [regular, bold] = await Promise.all([
    fetchTtf(FONT_REGULAR_URL),
    fetchTtf(FONT_BOLD_URL),
  ]);
  Font.register({
    family: 'NotoSans',
    fonts: [
      { src: `data:font/ttf;base64,${regular.toString('base64')}`, fontWeight: 'normal' },
      { src: `data:font/ttf;base64,${bold.toString('base64')}`,    fontWeight: 'bold' },
    ],
  });
  // Disable hyphenation since we have a non-English locale.
  Font.registerHyphenationCallback((word: string) => [word]);
  fontsLoaded = true;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await ensureFonts();
  } catch (e: any) {
    return new Response(`Font load error: ${e?.message || e}`, { status: 500 });
  }

  const supabase = createServerSupabase();
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id)
    .single();

  if (error || !tx) return new Response('Not found', { status: 404 });

  const stream = await renderToStream(React.createElement(TransactionPDF, { transaction: tx }) as any);
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
