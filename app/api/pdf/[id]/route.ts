import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CDN_REG = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const CDN_BOLD = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

async function loadFont(name: string, url: string): Promise<Uint8Array> {
  const p = path.join(process.cwd(), 'public', 'fonts', name);
  if (existsSync(p)) return new Uint8Array(readFileSync(p));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Font CDN ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function loadTemplate(): Promise<Uint8Array> {
  const p = path.join(process.cwd(), 'public', 'template.pdf');
  if (existsSync(p)) return new Uint8Array(readFileSync(p));
  throw new Error('Template PDF not found');
}

function white(page: any, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1,1,1) });
}

async function buildPdf(tx: any): Promise<Uint8Array> {
  const [templateBytes, regBytes, boldBytes] = await Promise.all([
    loadTemplate(),
    loadFont('NotoSans-Regular.ttf', CDN_REG),
    loadFont('NotoSans-Bold.ttf', CDN_BOLD),
  ]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  
  const regFont = await pdfDoc.embedFont(regBytes);
  const boldFont = await pdfDoc.embedFont(boldBytes);
  
  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { height } = page.getSize(); // 841.89 for A4
  
  const cu = tx.customers || {};
  const items = (tx.transaction_items || []) as any[];
  const total = Number(tx.total_amount || 0);
  const date = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
  const words = numberToBulgarianWords(total);
  const name = [cu.first_name, cu.middle_name, cu.last_name].filter(Boolean).join(' ');
  
  // Helper: pdf-lib uses bottom-left origin, template was likely created top-left
  // Convert: pdfY = height - topY
  function py(topY: number) { return height - topY; }
  
  function drawText(text: string, x: number, topY: number, size: number, bold = false) {
    const font = bold ? boldFont : regFont;
    page.drawText(text, { x, y: py(topY), size, font, color: rgb(0,0,0) });
  }
  
  // WHITE OUT all dynamic fields, then redraw with actual data
  // Coordinates determined from template analysis (topY from top of page)
  
  // === ПИС SECTION ===
  // No: receipt number (approx x:150, topY:95, w:120, h:14)
  white(page, 148, py(109), 160, 16); drawText(tx.receipt_number, 150, 106, 11, true);
  // Date (approx x:350, topY:95)
  white(page, 310, py(109), 200, 16); drawText(`Дата:  ${date} г.`, 315, 106, 11, true);
  
  // Customer line: name, EGN, id card, issued date
  white(page, 80, py(130), 430, 14);
  drawText(`${name}`, 82, 127, 9);
  drawText(`ЕГН  ${cu.egn}`, 260, 127, 9);
  drawText(`л. к .  ${cu.id_card_number}`, 360, 127, 9);
  drawText(`издадена на  ${cu.id_card_issued_date}`, 450, 127, 9);
  
  // issued by, city, municipality, address
  white(page, 20, py(145), 560, 14);
  drawText(`от  ${cu.id_card_issued_by}`, 22, 142, 9);
  drawText(`град (с)  ${cu.city}`, 155, 142, 9);
  drawText(`община  ${cu.municipality}`, 280, 142, 9);
  drawText(`адрес  ${cu.address}`, 390, 142, 9);
  
  // Table row (first item - assuming single item for now)
  const item = items[0];
  if (item) {
    white(page, 20, py(195), 560, 14);
    drawText(`1  ${item.nomenclatures?.name} (${item.nomenclatures?.waste_code})`, 22, 192, 8);
    drawText(item.nomenclatures?.unit || 'kg', 290, 192, 8);
    drawText(Number(item.quantity).toFixed(2), 330, 192, 8);
    drawText(Number(item.unit_price).toFixed(4), 400, 192, 8);
    drawText(Number(item.total_price).toFixed(2), 480, 192, 8);
  }
  
  // Словом
  white(page, 20, py(215), 380, 14);
  drawText(`Словом общо:  ${words}`, 22, 212, 8);
  // Сума за плащане
  white(page, 430, py(215), 150, 14);
  drawText(`Сума за плащане:         ${total.toFixed(2)}`, 432, 212, 8);
  
  // Payment method + operator
  white(page, 20, py(228), 560, 13);
  if (tx.payment_method === 'cash') {
    drawText('В брой', 22, 225, 8);
  } else {
    drawText(`Плащане ще се извърши по сметка: ${tx.bank_account}  ${tx.bank_name}  ${tx.bank_bic}`, 22, 225, 8);
  }
  
  // Operator (купувач) name under signature line
  white(page, 100, py(245), 220, 13);
  drawText(tx.operator_name || '', 150, 242, 8);
  // Продавач (customer) name
  white(page, 360, py(245), 200, 13);
  drawText(name, 380, 242, 8);
  
  // === ДЕКЛАРАЦИЯ SECTION ===
  // Customer name line
  white(page, 110, py(295), 440, 13);
  drawText(name, 112, 292, 8.5);
  drawText(`ЕГН  ${cu.egn}`, 290, 292, 8.5);
  drawText(`град (с)  ${cu.city}`, 400, 292, 8.5);
  
  // municipality, address, id card
  white(page, 20, py(310), 560, 13);
  drawText(`община  ${cu.municipality}`, 22, 307, 8.5);
  drawText(`адрес  ${cu.address}`, 120, 307, 8.5);
  drawText(`л. к .  ${cu.id_card_number}`, 300, 307, 8.5);
  drawText(`издадена на  ${cu.id_card_issued_date}`, 390, 307, 8.5);
  drawText(`от  ${cu.id_card_issued_by}`, 490, 307, 8.5);
  
  // Декларация item row
  if (item) {
    white(page, 20, py(348), 560, 13);
    drawText(`1  ${item.nomenclatures?.name}`, 22, 345, 8);
    drawText(Number(item.quantity).toFixed(2), 300, 345, 8);
    drawText(words, 360, 345, 8);
    drawText(item.nomenclatures?.unit || 'kg', 520, 345, 8);
  }
  
  // Date + location in декларация
  white(page, 20, py(410), 250, 13);
  drawText(`Дата:   ${date}`, 22, 407, 8.5);
  // Декларатор name
  white(page, 390, py(398), 190, 13);
  drawText(name, 395, 395, 8.5);
  
  // === ДОГОВОР SECTION ===
  // Contract number and date in title
  white(page, 180, py(440), 350, 16);
  drawText(tx.contract_number || tx.receipt_number, 210, 453, 11, true);
  drawText(`/  ${date} г.`, 330, 453, 11, true);
  
  // "Днес, DATE г. в CITY"
  white(page, 40, py(470), 500, 13);
  drawText(`Днес,   ${date} г.   в   ${cu.city || 'София'}`, 42, 467, 9);
  
  // Operator name (Милан Шопов lines)
  white(page, 210, py(485), 200, 13);
  drawText(tx.operator_name || '', 215, 482, 9);
  
  // Customer name lines in договор
  white(page, 20, py(500), 560, 13);
  drawText(`2.  ${name}`, 22, 497, 9);
  drawText(`с адрес   ${cu.address}`, 250, 497, 9);
  
  // EGN, ID card, issued by, issued date in договор
  white(page, 20, py(515), 560, 13);
  drawText(`ЕГН:  ${cu.egn}   л. к .   ${cu.id_card_number}   издадена от`, 22, 512, 9);
  drawText(`${cu.id_card_issued_by}`, 260, 512, 9);
  drawText(`на  ${cu.id_card_issued_date}`, 370, 512, 9);
  
  // PIS reference in предмет
  white(page, 300, py(560), 270, 13);
  drawText(`ПИС №  ${tx.receipt_number}  /  ${date}`, 305, 557, 9);
  
  // Payment line in договор
  white(page, 20, py(578), 560, 13);
  if (tx.payment_method !== 'cash') {
    drawText(`Плащането ще се извърши по сметка: ${tx.bank_account}  ${tx.bank_name}  ${tx.bank_bic}`, 22, 575, 8.5);
  }
  
  // Final signatures in договор
  white(page, 100, py(645), 200, 13);
  drawText(tx.operator_name || '', 150, 642, 8.5);
  white(page, 360, py(645), 200, 13);
  drawText(name, 380, 642, 8.5);
  
  return await pdfDoc.save();
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = createServerSupabase();
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id).single();

  if (error || !tx) return new Response('Not found', { status: 404 });

  try {
    const pdf = await buildPdf(tx);
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return new Response(`PDF error: ${e?.message}\n${e?.stack}`, { status: 500 });
  }
}
