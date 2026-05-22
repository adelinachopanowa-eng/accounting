import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('nomenclatures').select('*').eq('active', true).order('name');
  return NextResponse.json({ data });
}
