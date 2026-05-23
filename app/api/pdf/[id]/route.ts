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
      // borders
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

    // ── ПИС ────────────────────────────────────────────────────────
    section(() => {
      titleLine(`ПОКУПКО-ИЗПЛАЩАТЕЛНА СМЕТКА (ПИС) № ${tx.receipt_number}`);
      twoCol('Прогрестрейд ЕООД, гр. София, ул. проф. Иван Георгов №1', `Дата: ${date}`);
      twoCol('ЕИК: 130975863 / ДДС №: BG130975863', `Оператор: ${tx.operator_name || ''}`);
      y += 2;
      textLine(`Доставчик: ${name}, ЕГН: ${cu.egn}`);
      textLine(`ЛК №: ${cu.id_card_number}, изд. от ${cu.id_card_issued_by} на ${cu.id_card_issued_date}, валидна до ${cu.id_card_expiry}`);
      textLine(`Адрес: ${cu.address}, гр. ${cu.city}, общ. ${cu.municipality}`);
      y += 2;
      table(
        [
          ['№', 'Наименование', 'Мярка', 'Количество', 'Ед. цена', 'Обща стойн.'],
          ...items.map((it, i) => [
            String(i+1),
            `${it.nomenclatures?.name} (${it.nomenclatures?.waste_code})`,
            it.nomenclatures?.unit || 'кг',
            Number(it.quantity).toFixed(3),
            Number(it.unit_price).toFixed(4),
            Number(it.total_price).toFixed(2),
          ]),
          ['', '', '', '', 'ОБЩО:', `${total.toFixed(2)} лв.`],
        ],
        [0.05, 0.39, 0.09, 0.14, 0.14, 0.19]
      );
      y += 2;
      textLine(`Словом: ${words}`, 7);
      textLine(`Начин на плащане: ${pay}`);
      sigRow('Купувач: ________________', 'Продавач: ________________');
    });

    // ── ДЕКЛАРАЦИЯ ─────────────────────────────────────────────────
    section(() => {
      titleLine('ДЕКЛАРАЦИЯ ЗА ПРОИЗХОД НА ОТПАДЪЦИ');
      textLine(
        `Долуподписаният(ата) ${name}, ЕГН ${cu.egn}, притежател на ЛК № ${cu.id_card_number}, издадена от ${cu.id_card_issued_by} на ${cu.id_card_issued_date}, с адрес ${cu.address}, гр. ${cu.city}, общ. ${cu.municipality}, декларирам, че описаните в ПИС № ${tx.receipt_number} от ${date} отпадъци са моя собственост, произхождат от законен източник, не са придобити чрез престъпление, не са общинска или държавна собственост, не са част от електрически, електронен или друг уред, който подлежи на връщане по реда на ЗУО. Известно ми е, че за деклариране на неверни данни нося наказателна отговорност по чл. 313 от НК.`,
        7
      );
      sigRow(`Дата: ${date}`, 'Декларатор: ________________');
    });

    // ── ДОГОВОР ────────────────────────────────────────────────────
    section(() => {
      titleLine(`ДОГОВОР № ${tx.contract_number || tx.receipt_number}`);
      textLine(
        `Днес, ${date} г., в гр. София, между "Прогрестрейд" ЕООД, ЕИК 130975863, седалище: гр. София, ул. проф. Иван Георгов №1, наричано КУПУВАЧ, и ${name}, ЕГН ${cu.egn}, ЛК № ${cu.id_card_number}, адрес ${cu.address}, гр. ${cu.city}, наричан ПРОДАВАЧ, се сключи настоящият договор.`,
        7
      );
      y += 2;
      textLine(`Чл. 1. ПРОДАВАЧЪТ продава, а КУПУВАЧЪТ купува отпадъците от ПИС № ${tx.receipt_number} от ${date} на стойност ${total.toFixed(2)} лв. (${words}).`, 7);
      textLine(`Чл. 2. Плащането се извършва ${payC}.`, 7);
      textLine('Чл. 3. ПРОДАВАЧЪТ декларира законен произход и носи отговорност за верността на данните.', 7);
      textLine('Чл. 4. Договорът се състави в два еднообразни екземпляра — по един за всяка страна.', 7);
      sigRow('ПРОДАВАЧ: ________________', 'КУПУВАЧ: ________________');
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
