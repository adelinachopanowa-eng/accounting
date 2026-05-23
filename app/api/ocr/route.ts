import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

async function getAccessToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
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
  return d.access_token as string;
}

function parseBulgarianID(text: string) {
  const data: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // EGN - 10 consecutive digits
  const egnMatch = text.match(/\b(\d{10})\b/);
  if (egnMatch) data.egn = egnMatch[1];

  // ID card number - 9 digits
  const idMatches = [...text.matchAll(/\b(\d{9})\b/g)];
  for (const m of idMatches) {
    if (m[1] !== data.egn?.slice(0, 9)) {
      data.id_card_number = m[1];
      break;
    }
  }

  // Try MRZ parsing (3 lines of ~30 chars with < characters)
  const mrzLines = lines.filter(l => /^[A-Z0-9<]{15,}$/.test(l));
  if (mrzLines.length >= 2) {
    const nameLine = mrzLines[mrzLines.length - 1];
    const parts = nameLine.replace(/</g, ' ').trim().split(/\s{2,}/);
    if (parts.length >= 1) {
      const nameParts = parts[0].trim().split(' ').filter(Boolean);
      if (nameParts[0]) data.last_name = toTitleCase(nameParts[0]);
    }
    if (parts.length >= 2) {
      const givenParts = parts[1].trim().split(' ').filter(Boolean);
      if (givenParts[0]) data.first_name = toTitleCase(givenParts[0]);
      if (givenParts[1]) data.middle_name = toTitleCase(givenParts[1]);
    }

    // Date line
    const dateLine = mrzLines.find(l => /^\d{6}[0-9MF]/.test(l));
    if (dateLine) {
      const dob = dateLine.slice(0, 6);
      const expiry = dateLine.slice(8, 14);
      // dob: YYMMDD
      const year = parseInt(dob.slice(0, 2));
      const fullYear = year > 30 ? `19${dob.slice(0, 2)}` : `20${dob.slice(0, 2)}`;
      // expiry: YYMMDD
      const expYear = parseInt(expiry.slice(0, 2));
      const fullExpYear = `20${expiry.slice(0, 2)}`;
      data.id_card_expiry = `${fullExpYear}-${expiry.slice(2, 4)}-${expiry.slice(4, 6)}`;
    }
  }

  // Cyrillic name patterns
  if (!data.last_name) {
    const cyrillicNames = lines.filter(l => /^[А-ЯЁ][а-яё]+$/.test(l) || /^[А-ЯЁ]{2,}$/.test(l));
    if (cyrillicNames.length >= 3) {
      data.last_name = toTitleCase(cyrillicNames[0]);
      data.first_name = toTitleCase(cyrillicNames[1]);
      data.middle_name = toTitleCase(cyrillicNames[2]);
    } else if (cyrillicNames.length === 2) {
      data.last_name = toTitleCase(cyrillicNames[0]);
      data.first_name = toTitleCase(cyrillicNames[1]);
    }
  }

  // Issued by
  const issuedMatch = text.match(/(?:МВР|MVR|издаден от)[\s:]+([^\n]+)/i);
  if (issuedMatch) data.id_card_issued_by = issuedMatch[1].trim();
  else if (text.includes('МВР')) data.id_card_issued_by = 'МВР';

  // Issued date - look for DD.MM.YYYY pattern
  const dateMatches = [...text.matchAll(/(\d{2}\.\d{2}\.\d{4})/g)];
  if (dateMatches.length >= 1) {
    const [d, m, y] = dateMatches[0][1].split('.');
    data.id_card_issued_date = `${y}-${m}-${d}`;
  }
  if (dateMatches.length >= 2 && !data.id_card_expiry) {
    const [d, m, y] = dateMatches[1][1].split('.');
    data.id_card_expiry = `${y}-${m}-${d}`;
  }

  // City / address
  const addrMatch = text.match(/(?:адрес|address|гр\.|с\.)[\s.:]+([^\n]+)/i);
  if (addrMatch) data.address = addrMatch[1].trim();

  const cityMatch = text.match(/(?:гр\.|град|с\.|село)\s*([А-ЯЁа-яё]+)/i);
  if (cityMatch) data.city = toTitleCase(cityMatch[1]);

  return data;
}

function toTitleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const base64 = image.includes(',') ? image.split(',')[1] : image;

    const token = await getAccessToken();
    const visionRes = await fetch(
      'https://vision.googleapis.com/v1/images:annotate',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();
    if (visionData.error) throw new Error(visionData.error.message);

    const text = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
    if (!text) return NextResponse.json({ error: 'Не е разпознат текст. Опитайте с по-ясна снимка.' }, { status: 422 });

    const parsed = parseBulgarianID(text);
    return NextResponse.json({ data: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'OCR грешка' }, { status: 500 });
  }
}
