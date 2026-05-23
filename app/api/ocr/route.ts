import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function lineAfter(lines: string[], pattern: RegExp): string | null {
  for (let i = 0; i < lines.length - 1; i++) {
    if (pattern.test(lines[i].trim())) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const v = lines[j].trim();
        if (v) return v;
      }
    }
  }
  return null;
}

function parseDate(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function parseBulgarianId(text: string) {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const lastName   = lineAfter(lines, /^Фамилия$/);
  const firstName  = lineAfter(lines, /^Име$/);
  const middleName = lineAfter(lines, /^Презиме$/);
  const egnMatch   = text.match(/\b(\d{10})\b/);
  const idMatch    = text.match(/\b(\d{9})\b/);
  const issuedBy   = lineAfter(lines, /^(Издадена?\s*от|Authority)$/i);
  const issuedRaw  = lineAfter(lines, /^(Дата\s*на\s*издаване|Date of issue)$/i);
  const expiryRaw  = lineAfter(lines, /^(Валидно\s*до|Expiry|Valid until)$/i);
  let expiryMrz: string | null = null;
  for (const line of lines) {
    if (/^[A-Z0-9<]{30,44}$/.test(line)) {
      const exp = line.substring(19, 25);
      if (/^\d{6}$/.test(exp)) {
        const yy = parseInt(exp.substring(0, 2));
        const mm = exp.substring(2, 4);
        const dd = exp.substring(4, 6);
        const yyyy = yy > 30 ? `19${String(yy).padStart(2,'0')}` : `20${String(yy).padStart(2,'0')}`;
        expiryMrz = `${yyyy}-${mm}-${dd}`;
      }
    }
  }
  const addressLine = lineAfter(lines, /^(Пос႐оянен\s*адрес|Перманентен\s*адрес|Адрес|Address)$/i);
  const cityLine    = lineAfter(lines, /^(Населено\s*място|Град|City)$/i);
  const muniLine    = lineAfter(lines, /^(Община|Municipality)$/i);
  return {
    last_name: lastName, first_name: firstName, middle_name: middleName,
    egn: egnMatch?.[1] ?? null,
    id_card_number: idMatch?.[1] ?? null,
    id_card_issued_by: issuedBy,
    id_card_issued_date: parseDate(issuedRaw),
    id_card_expiry: parseDate(expiryRaw) || expiryMrz,
    address: addressLine, city: cityLine, municipality: muniLine,
  };
}

async function ocrWithGoogleVision(base64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY not set');
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: base64 }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.responses?.[0]?.fullTextAnnotation?.text || json.responses?.[0]?.textAnnotations?.[0]?.description || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: string[] = body.images || (body.image ? [body.image] : []);
    if (!images.length) return NextResponse.json({ error: 'No images' }, { status: 400 });
    let combinedText = '';
    for (const img of images) {
      combinedText += await ocrWithGoogleVision(img.replace(/^data:image\/\w+;base64,/, '')) + '\n';
    }
    return NextResponse.json({ data: parseBulgarianId(combinedText), rawText: combinedText });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
