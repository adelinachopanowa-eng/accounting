import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function toTitleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function lineAfter(lines: string[], pattern: RegExp): string | null {
  for (let i = 0; i < lines.length - 1; i++) {
    if (pattern.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j].trim()) return lines[j].trim();
      }
    }
  }
  return null;
}

function parseBulgarianID(text: string) {
  const data: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Names from Cyrillic labels
  const surname = lineAfter(lines, /^Фамилия$/);
  if (surname) data.last_name = toTitleCase(surname);

  const firstName = lineAfter(lines, /^Име$/);
  if (firstName) data.first_name = toTitleCase(firstName);

  const middleName = lineAfter(lines, /^Презиме$/);
  if (middleName) data.middle_name = toTitleCase(middleName);

  // EGN
  const egnMatch = text.match(/\b(\d{10})\b/);
  if (egnMatch) data.egn = egnMatch[1];

  // Document number (9 digits, not part of EGN)
  for (const m of text.matchAll(/\b(\d{9})\b/g)) {
    if (!data.egn?.includes(m[1])) { data.id_card_number = m[1]; break; }
  }

  // Expiry date
  const expiryIdx = lines.findIndex(l => /Валидност|Date of expiry/i.test(l));
  if (expiryIdx >= 0) {
    const expiryLine = lines[expiryIdx];
    const inlineDate = expiryLine.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (inlineDate) {
      data.id_card_expiry = `${inlineDate[3]}-${inlineDate[2]}-${inlineDate[1]}`;
    } else {
      for (let j = expiryIdx + 1; j < Math.min(expiryIdx + 4, lines.length); j++) {
        const dm = lines[j].match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dm) { data.id_card_expiry = `${dm[3]}-${dm[2]}-${dm[1]}`; break; }
      }
    }
  }

  // Issue date — appears after "Дата на издаване", sometimes 2-3 lines later
  const issueDateIdx = lines.findIndex(l => /Дата на издаване/.test(l));
  if (issueDateIdx >= 0) {
    for (let j = issueDateIdx + 1; j < Math.min(issueDateIdx + 6, lines.length); j++) {
      const dm = lines[j].match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (dm) { data.id_card_issued_date = `${dm[3]}-${dm[2]}-${dm[1]}`; break; }
    }
  }

  // Issued by — "Издаден от thority МВР София/..."
  const issuedIdx = lines.findIndex(l => /Издаден от/.test(l));
  if (issuedIdx >= 0) {
    const issuedLine = lines[issuedIdx];
    const mvrInline = issuedLine.match(/(МВР[^/\n]*)/);
    if (mvrInline) data.id_card_issued_by = mvrInline[1].trim();
  }

  // City — look for ГР.XXXX/XXXX pattern
  const grMatch = text.match(/ГР\.([А-ЯЁ]+)\/[A-Z]+/i);
  if (grMatch) data.city = toTitleCase(grMatch[1]);
  else {
    // fallback: XXXX/SOFIA pattern
    const cityFallback = text.match(/([А-ЯЁ]{3,})\/(?:SOFIA|PLOVDIV|VARNA|BURGAS|[A-Z]{3,})/);
    if (cityFallback) data.city = toTitleCase(cityFallback[1]);
  }

  // Address — line starting with ЖК, УЛ, БУЛ, ПЖ
  const addrMatch = text.match(/(?:ЖК\.?|УЛ\.?|БУЛ\.?|жк\.?|ул\.?)\s*([^\n]{5,})/i);
  if (addrMatch) data.address = addrMatch[0].trim();

  return data;
}

async function visionOCR(base64: string, apiKey: string): Promise<string> {
  const content = base64.includes(',') ? base64.split(',')[1] : base64;
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
      }),
    }
  );
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.responses?.[0]?.fullTextAnnotation?.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GOOGLE_VISION_API_KEY не е настроен' }, { status: 500 });

    const body = await req.json();
    const imageList: string[] = body.images ?? (body.image ? [body.image] : []);
    if (!imageList.length) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const texts = await Promise.all(imageList.map(img => visionOCR(img, apiKey)));
    const combinedText = texts.join('\n');

    if (!combinedText.trim())
      return NextResponse.json({ error: 'Не е разпознат текст. Опитайте с по-ясна снимка.' }, { status: 422 });

    return NextResponse.json({ data: parseBulgarianID(combinedText) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OCR грешка' }, { status: 500 });
  }
}
