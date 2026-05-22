import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const mediaType = (image.match(/^data:(image\/\w+);/)?.[1] || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'This is a Bulgarian identity card. Extract ALL the following fields and return ONLY valid JSON: first_name (Име in Cyrillic), last_name (Фамилия in Cyrillic), middle_name (Презиме/баща in Cyrillic), egn (ЕГН/Personal No - 10 digits), id_card_number (№ на документа - 9 digits), id_card_issued_by (Издаден от/Authority), id_card_issued_date (Дата на издаване - format YYYY-MM-DD), id_card_expiry (Валидност - format YYYY-MM-DD), address (full street address from back), city, municipality. Return JSON only, no markdown.' },
        ],
      }],
    });

    const text = msg.content.filter(c => c.type === 'text').map((c: any) => c.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(clean);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
