import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const egn = req.nextUrl.searchParams.get('egn');
  const supabase = createServerSupabase();
  if (egn) {
    const { data } = await supabase.from('customers').select('*').eq('egn', egn).maybeSingle();
    return NextResponse.json({ data });
  }
  const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = createServerSupabase();
  const { data, error } = await supabase.from('customers').upsert(body, { onConflict: 'egn' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
