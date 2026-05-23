import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

async function getAccessToken() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON не е настроен в Vercel');
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-vision',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const sigInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sigInput);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${sigInput}.${sig}`;

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Google auth грешка: ' + JSON.stringify(d));
  return d.access_token as string;
}

function toTitleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function parseBulgarianID(text: string) {
  const data: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const egnMatch = text.match(/\b(\d{10})\b/);
  if (egnMatch) data.egn = egnMatch[1];

  const idMatches = [...text.matchAll(/\b(\d{9})\b/g)];
  for (const m of idMatches) {
    if (m[1] !== data.egn?.slice(0, 9)) { data.id_card_number = m[1]; break; }
  }

  // MRZ lines (contain only uppercase + digits + <)
  const mrzLines = lines.filter(l => l.length >= 20 && /^[A-Z0-9<]+$/.test(l));
  if (mrzLines.length >= 1) {
    const nameLine = mrzLines[mrzLines.length - 1];
    const parts = nameLine.replace(/</g, ' ').trim().split(/\s{2,}/);
    if (parts[0]) {
      const lastParts = parts[0].trim().split(' ').filter(Boolean);
      if (lastParts[0]) data.last_name = toTitleCase(lastParts[0]);
    }
    if (parts[1]) {
      const givenParts = parts[1].trim().split(' ').filter(Boolean);
      if (givenParts[0]) data.first_name = toTitleCase(givenParts[0]);
      if (givenParts[1]) data.middle_name = toTitleCase(givenParts[1]);
    }
    const dateLine = mrzLines.find(l => /^\d{6}[0-9MF<]/.test(l));
    if (dateLine && dateLine.length >= 14) {
      const expiry = dateLine.slice(8, 14);
      const expY = parseInt(expiry.slice(0, 2));
      const fullExpY = expY < 50 ? `20${expiry.slice(0,2)}` : `19${expiry.slice(0,2)}`;
      data.id_card_expiry = `${fullExpY}-${expiry.slice(2,4)}-${expiry.slice(4,6)}`;
    }
  }

  // Cyrillic names if MRZ didn't catch them
  if (!data.last_name) {
    const cyrNames = lines.filter(l => /^[А-ЯЁ][А-ЯЁа-яё\-]+$/.test(l) && l.length > 2);
    if (cyrNames[0]) data.last_name = toTitleCase(cyrNames[0]);
    if (cyrNames[1]) data.first_name = toTitleCase(cyrNames[1]);
    if (cyrNames[2]) data.middle_name = toTitleCase(cyrNames[2]);
  }

  // Dates DD.MM.YYYY
  const dateMatches = [...text.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)];
  if (dateMatches[0]) data.id_card_issued_date = `${dateMatches[0][3]}-${dateMatches[0][2]}-${dateMatches[0][1]}`;
  if (dateMatches[1] && !data.id_card_expiry) data.id_card_expiry = `${dateMatches[1][3]}-${dateMatches[1][2]}-${dateMatches[1][1]}`;

  // Issued by MVR
  if (text.match(/МВР|MVR/)) data.id_card_issued_by = 'МВР';
  const issuedMatch = text.match(/(?:МВР|MVR)[\s\-]+([^\.\n]+)/);
  if (issuedMatch) data.id_card_issued_by = 'MVR ' + issuedMatch[1].trim();

  // City
  const cityMatch = text.match(/(?:гр\.?|ГР\.?)\s*([А-ЯЁ][а-яёА-ЯЁ]+)/);
  if (cityMatch) data.city = toTitleCase(cityMatch[1]);

  // Address
  const addrMatch = text.match(/(?:ул\.?|бул\.?|жк\.?|пж[\s.])[\s]*([^\.\n]{5,})/);
  if (addrMatch) data.address = addrMatch[1].trim();

  return data;
}

async function ocrImage(base64: string, token: string): Promise<string> {
  const content = base64.includes(',') ? base64.split(',')[1] : base64;
  const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ image: { content }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.responses?.[0]?.fullTextAnnotation?.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Support both single image (legacy) and multiple images
    const imageList: string[] = body.images ?? (body.image ? [body.image] : []);
    if (!imageList.length) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const token = await getAccessToken();
    const texts = await Promise.all(imageList.map(img => ocrImage(img, token)));
    const combinedText = texts.join('\n');

    if (!combinedText.trim())
      return NextResponse.json({ error: 'Не е разпознат текст. Опитайте с по-ясна снимка.' }, { status: 422 });

    return NextResponse.json({ data: parseBulgarianID(combinedText) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OCR грешка' }, { status: 500 });
  }
}
