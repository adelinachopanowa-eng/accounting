import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { NOTO_REGULAR, NOTO_BOLD } from '@/lib/fonts-data';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function buildPdf(tx: any): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const M = 28, PW = 595.28, PH = 841.89, CW = PW - 2 * M, PAD = 4;
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: true, bufferPages: true, margin: 0 });
    doc.registerFont('R', NOTO_REGULAR);
    doc.registerFont('B', NOTO_BOLD);

    const chunks: Buffer[] = [];
    doc.on('data',  (c: Buffer) => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cu    = tx.customers || {};
    const items = (tx.transaction_items || []) as any[];
    const total = Number(tx.total_amount || 0);
    const date  = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
    const words = numberToBulgarianWords(total);
    const name  = [cu.first_name, cu.middle_name, cu.last_name].filter(Boolean).join(' ');

    let y = M;

    function txt(s: string, x: number, yy: number, opts: Record<string,unknown> = {}) {
      doc.text(s, x, yy, opts);
    }
    function line(x1: number, y1: number, x2: number, y2: number, w = 0.4) {
      doc.strokeColor('#000').lineWidth(w).moveTo(x1, y1).lineTo(x2, y2).stroke();
    }
    function section(drawFn: () => void) {
      const sy = y;
      y += PAD;
      drawFn();
      y += PAD;
      doc.strokeColor('#000').lineWidth(0.5).rect(M, sy, CW, y - sy).stroke();
      y += 5;
    }
    function textLine(s: string, size = 7, bold = false) {
      doc.font(bold ? 'B' : 'R').fontSize(size);
      const h = doc.heightOfString(s, { width: CW - 2*PAD });
      txt(s, M + PAD, y, { width: CW - 2*PAD });
      y += h + 1.5;
    }
    function twoColLine(left: string, right: string, size = 7) {
      doc.font('R').fontSize(size);
      const lw = (CW - 2*PAD) * 0.60;
      const rw = (CW - 2*PAD) * 0.40;
      txt(left,  M + PAD,      y, { width: lw });
      txt(right, M + PAD + lw, y, { width: rw, align: 'right' });
      y += 11;
    }
    function sigRow(left: string, right: string) {
      y += 6;
      const hw = (CW - 2*PAD) / 2 - 15;
      const lx = M + PAD + 5, rx = M + PAD + (CW - 2*PAD) / 2 + 5;
      line(lx, y, lx + hw, y);
      line(rx, y, rx + hw, y);
      y += 3;
      doc.font('R').fontSize(6.5);
      txt(left,  lx, y, { width: hw, align: 'center' });
      txt(right, rx, y, { width: hw, align: 'center' });
      y += 12;
    }
    function table(rows: string[][], colFracs: number[], rowH = 11) {
      const tw = CW - 2*PAD, tx0 = M + PAD;
      const colW = colFracs.map(f => tw * f);
      const sy = y;
      rows.forEach((row, ri) => {
        let cx = tx0;
        const isHeader = ri === 0;
        const isTotal  = ri === rows.length - 1;
        row.forEach((cell, ci) => {
          doc.font(isHeader || (isTotal && ci >= 3) ? 'B' : 'R').fontSize(6.5);
          const align: 'left'|'center'|'right' = ci >= 3 ? 'right' : (ci === 0 ? 'center' : 'left');
          txt(cell, cx + 2, y + 2, { width: colW[ci] - 4, align, ellipsis: true, lineBreak: false });
          cx += colW[ci];
        });
        y += rowH;
      });
      const th = y - sy;
      doc.strokeColor('#000').lineWidth(0.4).rect(tx0, sy, tw, th).stroke();
      let ry = sy;
      rows.forEach((_, ri) => { ry += rowH; if (ri < rows.length-1) { line(tx0, ry, tx0+tw, ry, 0.3); } });
      let cx = tx0;
      colW.slice(0,-1).forEach(cw => { cx += cw; line(cx, sy, cx, sy+th, 0.3); });
    }

    // Header
    doc.font('R').fontSize(7);
    txt('Прогрестрейд ЕООД', M, 14);
    txt('София, ул. Професор Иван Георгов №1', M + 110, 14);
    txt('ИН по ЗДДС: BG130975863  ИН: 130975863', M + 295, 14);
    doc.font('B').fontSize(7);
    txt('Склад стоки', PW - M - 55, 14);
    line(M, 23, PW - M, 23, 0.5);
    y = 29;

    // ПИС
    section(() => {
      doc.font('B').fontSize(9);
      txt('Покупко - изплащателна сметка', M + PAD, y, { width: CW * 0.6 });
      doc.font('R').fontSize(6.5);
      txt('No и Дата на разрешението: 12-ДО-00001270-00/05.06.2013 г.', M + PAD + CW * 0.6, y, { width: CW * 0.4 - PAD, align: 'right' });
      y += 13;

      doc.font('B').fontSize(8);
      txt(`No:  ${tx.receipt_number}`, M + PAD, y);
      doc.font('R').fontSize(7);
      txt(`Дата:  ${date} г.`, M + PAD + 180, y);
      y += 12;

      doc.font('R').fontSize(7);
      txt(`Подписаният  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}`, M + PAD, y, { width: CW - 2*PAD });
      y += 10;
      txt(`удостоверявам, че предадох:  адрес ${cu.address || ''}`, M + PAD, y, { width: CW - 2*PAD });
      y += 10;

      table(
        [
          ['No', 'Наименование на предадените отпадъци', 'Мярка', 'Количество', 'Един. цена', 'Обща стойност'],
          ...items.map((it, i) => [
            String(i+1),
            `${it.nomenclatures?.name || ''} ${it.nomenclatures?.waste_code || ''}`,
            it.nomenclatures?.unit || 'kg',
            Number(it.quantity).toFixed(3),
            Number(it.unit_price).toFixed(4),
            Number(it.total_price).toFixed(2),
          ]),
        ],
        [0.05, 0.40, 0.08, 0.13, 0.14, 0.20]
      );
      y += 2;

      twoColLine(`Словом общо: ${words}`, `Сума за плащане:  ${total.toFixed(2)} лв.`, 7);
      sigRow(
        `Изплатил: ${tx.operator_name || ''}`,
        'Получих сумата: (подпис на лицето, предало отпадъка)'
      );
    });

    // Декларация
    section(() => {
      doc.font('B').fontSize(8);
      txt('Декларация за произход на отпадъци от черни и цветни метали', M + PAD, y, { width: CW * 0.65 });
      doc.font('R').fontSize(6.5);
      txt('Образец № 1 към чл. 39, ал. 4 от ЗУО', M + PAD + CW * 0.65, y, { width: CW * 0.35 - PAD, align: 'right' });
      y += 13;

      textLine(`Долуподписаният/ата  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}  адрес ${cu.address || ''}`);
      textLine('декларирам, че продавам собствени отпадъци от черни и цветни метали с битов характер, представляващи:');
      y += 2;

      items.forEach((it, i) => {
        const qty = Number(it.quantity);
        const qtyWords = numberToBulgarianWords(qty);
        textLine(`${i+1}  ${it.nomenclatures?.name || ''}  ${qty.toFixed(3)}  ${qtyWords} ${it.nomenclatures?.unit || 'kg'} и 00 gr`);
      });
      y += 2;

      textLine('Известна ми е наказателната отговорност, по чл. 313 от Наказателния кодекс за деклариране на неверни данни.');
      textLine(`Декларирам, че с настоящата сума получена в брой по ПИС №${tx.receipt_number}, не надвишавам сумата от 613.55 EUR, получени от предаване на ОЧЦМ във връзка с чл.38 ал.5 от ЗУО.`);

      sigRow(`Дата: ${date}  гр./с.: ${cu.city || 'София'}`, `Декларатор: ${name}`);
    });

    // Договор
    section(() => {
      doc.font('B').fontSize(8);
      txt(`Договор №${tx.contract_number || tx.receipt_number} / ${date} г.`, M + PAD, y, { width: CW - 2*PAD, align: 'center' });
      y += 12;

      textLine(`Днес, ${date} г. в ${cu.city || 'София'}, се сключи този договор за продажба между:`);
      textLine(`Прогрестрейд ЕООД със седалище и адрес на управление София, ул. професор Иван Георгов №1, ИН: 130975863, представлявано от ${tx.operator_name || ''}, наричан по-долу Купувач и`);
      textLine(`${name} с адрес ${cu.address || ''}, ЕГН: ${cu.egn || ''}, л. к. ${cu.id_card_number || ''}, издадена от ${cu.id_card_issued_by || ''}, на ${cu.id_card_issued_date || ''}, наричан по-долу Продавач`);
      y += 2;

      textLine(`Предмет на договора. Страните се споразумяха за следното: Продавача прехвърля на Купувача правото на собственост и му предава стоката, описана по-горе в ПИС №${tx.receipt_number} / ${date}, която е неразделна част от този договор, срещу задължението на Купувача да му заплати уговорената цена.`);

      if (tx.payment_method !== 'cash') {
        textLine(`Плащането ще се извърши по сметка: ${tx.bank_account || ''}  ${tx.bank_name || ''}  ${tx.bank_bic || ''}`);
      }

      textLine('Общи положения. Купувачът има право на обезщетение в размер на платената от него цена по този договор, ако бъде лишен от държането или бъде съдебно отстранен от закупените стоки поради това, че трети лица имат претенции за собствеността върху тях или неистинност на гореподписаната декларация.');
      textLine('Този договор се състави и подписа в два еднакви екземпляра, по един за всяка от страните.');

      sigRow(`Купувач: ${tx.operator_name || ''}`, `Продавач: ${name}`);
    });

    if (y < PH - 10) line(M, PH - 15, PW - M, PH - 15, 0.3);

    doc.end();
  });
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
    const buf = await buildPdf(tx);
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
