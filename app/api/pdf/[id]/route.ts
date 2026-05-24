import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CDN_REG  = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const CDN_BOLD = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';
let cReg: Buffer | null = null, cBold: Buffer | null = null;

async function loadFont(name: string, url: string): Promise<Buffer> {
  const t = `/tmp/${name}`, p = path.join(process.cwd(), 'public', 'fonts', name);
  if (existsSync(t)) return readFileSync(t);
  if (existsSync(p)) { const b = readFileSync(p); try { writeFileSync(t, b); } catch {} return b; }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Font CDN ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer());
  if (b.length < 50000) throw new Error(`Font too small (${b.length} bytes)`);
  try { writeFileSync(t, b); } catch {}
  return b;
}

async function getFonts(): Promise<[Buffer, Buffer]> {
  if (!cReg || !cBold) {
    [cReg, cBold] = await Promise.all([
      loadFont('NotoSans-Regular.ttf', CDN_REG),
      loadFont('NotoSans-Bold.ttf',    CDN_BOLD),
    ]);
  }
  return [cReg!, cBold!];
}

function buildPdf(tx: any, regBuf: Buffer, boldBuf: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const M = 30, PW = 595.28, CW = PW - 2 * M, PAD = 5;
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: true, bufferPages: true });
    doc.registerFont('R', regBuf);
    doc.registerFont('B', boldBuf);

    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cu     = tx.customers || {};
    const items  = (tx.transaction_items || []) as any[];
    const total  = Number(tx.total_amount || 0);
    const date   = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
    const words  = numberToBulgarianWords(total);
    const name   = [cu.first_name, cu.middle_name, cu.last_name].filter(Boolean).join(' ');
    const pay    = tx.payment_method === 'cash'
      ? 'В брой'
      : `По банков път - ${tx.bank_name} IBAN: ${tx.bank_account} BIC: ${tx.bank_bic}`;
    const payC   = tx.payment_method === 'cash'
      ? 'в брой при подписване на договора'
      : `по банков път IBAN ${tx.bank_account}, банка ${tx.bank_name}, BIC ${tx.bank_bic}`;

    let y = M;

    function txt(s: string, x: number, yy: number, opts: Record<string,unknown> = {}) {
      doc.text(s, x, yy, opts);
    }
    function titleLine(s: string) {
      doc.font('B').fontSize(10);
      txt(s, M + PAD, y, { width: CW - 2*PAD, align: 'center' });
      y += doc.heightOfString(s, { width: CW - 2*PAD }) + 3;
    }
    function textLine(s: string, size = 7.5, bold = false) {
      doc.font(bold ? 'B' : 'R').fontSize(size);
      const h = doc.heightOfString(s, { width: CW - 2*PAD });
      txt(s, M + PAD, y, { width: CW - 2*PAD });
      y += h + 1.5;
    }
    function twoCol(left: string, right: string) {
      const lw = (CW - 2*PAD) * 0.65, rw = (CW - 2*PAD) * 0.35;
      doc.font('R').fontSize(7.5);
      txt(left,  M + PAD,      y, { width: lw });
      txt(right, M + PAD + lw, y, { width: rw, align: 'right' });
      y += 12;
    }
    function sigRow(left: string, right: string) {
      y += 8;
      const hw = (CW - 2*PAD) / 2 - 20;
      const lx = M + PAD + 10, rx = M + PAD + (CW - 2*PAD) / 2 + 10;
      doc.strokeColor('#000').lineWidth(0.5);
      doc.moveTo(lx, y).lineTo(lx + hw, y).stroke();
      doc.moveTo(rx, y).lineTo(rx + hw, y).stroke();
      y += 3;
      doc.font('R').fontSize(7);
      txt(left,  lx, y, { width: hw, align: 'center' });
      txt(right, rx, y, { width: hw, align: 'center' });
      y += 14;
    }
    function table(rows: string[][], colFracs: number[], rowH = 12) {
      const tw = CW - 2*PAD, tx0 = M + PAD;
      const colW = colFracs.map(f => tw * f);
      const sy = y;
      rows.forEach((row, ri) => {
        let cx = tx0;
        row.forEach((cell, ci) => {
          const isHeader = ri === 0, isTotal = ri === rows.length - 1;
          doc.font(isHeader || (isTotal && ci > 0) ? 'B' : 'R').fontSize(7);
          const align: 'left'|'center'|'right' = ci >= 3 ? 'right' : 'left';
          txt(cell, cx + 2, y + 2, { width: colW[ci] - 4, align, ellipsis: true, lineBreak: false });
          cx += colW[ci];
        });
        y += rowH;
      });
      const th = y - sy;
      doc.strokeColor('#000').lineWidth(0.5);
      doc.rect(tx0, sy, tw, th).stroke();
      let ry = sy;
      rows.forEach((_, ri) => { ry += rowH; if (ri < rows.length-1) { doc.moveTo(tx0,ry).lineTo(tx0+tw,ry).stroke(); } });
      let cx = tx0;
      colW.slice(0,-1).forEach(cw => { cx += cw; doc.moveTo(cx,sy).lineTo(cx,sy+th).stroke(); });
    }
    function section(cb: () => void) {
      const sy = y;
      y += PAD;
      cb();
      y += PAD;
      doc.strokeColor('#000').lineWidth(0.5).rect(M, sy, CW, y - sy).stroke();
      y += 6;
    }

    // ── Header ─────────────────────────────────────────────────────
    doc.font('R').fontSize(7);
    txt('Прогрестрейд ЕООД', M, 15);
    txt('София, ул. професор Иван Георгов №1', M + 120, 15);
    txt('ИН по ЗДДС: BG130975863  ИН: 130975863', M + 310, 15);
    doc.moveTo(M, 25).lineTo(PW - M, 25).lineWidth(0.5).stroke();
    y = 32;

    // ── ПИС ────────────────────────────────────────────────────────
    section(() => {
      titleLine(`ПОКУПКО-ИЗПЛАЩАТЕЛНА СМЕТКА`);
      doc.font('B').fontSize(11);
      txt(`No:  ${tx.receipt_number}`, M + PAD + 60, y, { continued: true });
      doc.font('R').fontSize(9);
      txt(`   Дата: ${date} г.`, M + PAD + 200, y);
      y += 16;
      twoCol(`Прогрестрейд ЕООД, гр. София, ул. проф. Иван Георгов №1`, `No и Дата на разрешението:`);
      twoCol(`ИН: 130975863 / ДДС №: BG130975863`, `12-ДО-00001270-00/05.06.2013 г.`);
      y += 2;
      textLine(`Подписаният  ${name}   ЕГН ${cu.egn}   л. к. ${cu.id_card_number}`);
      textLine(`от ${cu.id_card_issued_by}   издадена на ${cu.id_card_issued_date}   адрес ${cu.address}`);
      textLine(`град (с) ${cu.city}   община ${cu.municipality}`);
      textLine('удостоверявам, че предадох:');
      y += 2;
      table(
        [
          ['No', 'Наименование на предадените отпадъци', 'Мярка', 'Количество', 'Един. цена', 'Обща стойност'],
          ...items.map((it, i) => [
            String(i+1),
            `${it.nomenclatures?.name} ${it.nomenclatures?.waste_code}`,
            it.nomenclatures?.unit || 'kg',
            Number(it.quantity).toFixed(3),
            Number(it.unit_price).toFixed(4),
            Number(it.total_price).toFixed(2),
          ]),
        ],
        [0.05, 0.42, 0.08, 0.13, 0.13, 0.19]
      );
      y += 2;
      twoCol(`Словом общо: ${words}`, `Сума за плащане: ${total.toFixed(2)}`);
      textLine(pay);
      sigRow(`Купувач: ${tx.operator_name || ''}`, 'Продавач:');
    });

    // ── ДЕКЛАРАЦИЯ ─────────────────────────────────────────────────
    section(() => {
      doc.font('B').fontSize(9);
      txt('Декларация за произход на отпадъци от черни и цветни метали', M + PAD, y, { width: CW * 0.65, align: 'center' });
      doc.font('R').fontSize(7);
      txt('Образец № 1 към чл. 39, ал. 4 от ЗУО', M + PAD + CW * 0.65, y, { width: CW * 0.35, align: 'right' });
      y += 14;
      textLine(`Долуподписаният/ата   ${name}   ЕГН ${cu.egn}   град (с) ${cu.city}`);
      textLine(`община ${cu.municipality}   адрес ${cu.address}   л. к. ${cu.id_card_number}   издадена на ${cu.id_card_issued_date}   от ${cu.id_card_issued_by}`);
      textLine('декларирам, че продавам собствени отпадъци от черни и цветни метали с битов характер, представляващи:');
      y += 2;
      items.forEach((it, i) => {
        textLine(`${i+1}  ${it.nomenclatures?.name}   ${Number(it.quantity).toFixed(3)}   ${numberToBulgarianWords(Number(it.quantity))}   ${it.nomenclatures?.unit || 'kg'}`);
      });
      y += 2;
      textLine('Известна ми е наказателната отговорност, по чл. 313 от Наказателния кодекс за деклариране на неверни данни.');
      textLine('Уведомен съм, че обектът е под видеонаблюдение.');
      sigRow(`Дата: ${date}   гр./с.: ${cu.city || 'София'}`, `Декларатор: ${name}`);
    });

    // ── ДОГОВОР ────────────────────────────────────────────────────
    section(() => {
      titleLine(`Договор №  ${tx.contract_number || tx.receipt_number}  /  ${date} г.`);
      textLine(`Днес, ${date} г. в ${cu.city || 'София'}, се сключи този договор за продажба между:`);
      textLine(`1. Прогрестрейд ЕООД, София, ул. професор Иван Георгов №1, ИН: 130975863, представлявано от ${tx.operator_name || ''}, наричан по-долу Купувач и`);
      textLine(`2. ${name}, с адрес ${cu.address}, ЕГН: ${cu.egn}, л. к. ${cu.id_card_number}, издадена от ${cu.id_card_issued_by}, на ${cu.id_card_issued_date}, наричан по-долу Продавач`);
      y += 2;
      textLine('Страните се споразумяха за следното:');
      textLine(`1. Предмет на договора. Продавача прехвърля на Купувача правото на собственост и му предава стоката, описана по-горе в ПИС № ${tx.receipt_number} / ${date}, която е неразделна част от този договор, срещу задължението на Купувача да му заплати уговорената цена.`);
      if (tx.payment_method !== 'cash') {
        textLine(`Плащането ще се извърши по сметка: ${tx.bank_account}  ${tx.bank_name}  ${tx.bank_bic}`);
      }
      textLine('2. Общи положения. Купувачът има право на обезщетение в размер на платената от него цена по този договор, ако бъде лишен от държането или бъде съдебно отстранен от закупените стоки поради това, че трети лица имат претенции за собствеността върху тях или неистинност на гореподписаната декларация.');
      textLine('Този договор се състави и подписа в два еднакви екземпляра, по един за всяка от страните.');
      sigRow(`Купувач: ${tx.operator_name || ''}`, `Продавач: ${name}`);
    });

    doc.end();
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let reg: Buffer, bold: Buffer;
  try { [reg, bold] = await getFonts(); }
  catch (e: any) { return new Response(`Font error: ${e?.message}`, { status: 500 }); }

  const supabase = createServerSupabase();
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id).single();

  if (error || !tx) return new Response('Not found', { status: 404 });

  try {
    const buf = await buildPdf(tx, reg, bold);
    return new Response(new Uint8Array(buf), {
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
