import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { readFileSync } from 'fs';
import path from 'path';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

let vfs: Record<string, string> | null = null;

function getVfs() {
  if (vfs) return vfs;
  const dir = path.join(process.cwd(), 'public', 'fonts');
  vfs = {
    'NotoSans-Regular.ttf': readFileSync(path.join(dir, 'NotoSans-Regular.ttf')).toString('base64'),
    'NotoSans-Bold.ttf':    readFileSync(path.join(dir, 'NotoSans-Bold.ttf')).toString('base64'),
  };
  return vfs;
}

function buildDocDef(tx: any) {
  const c = tx.customers || {};
  const items: any[] = tx.transaction_items || [];
  const total = Number(tx.total_amount || 0);
  const date = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
  const totalWords = numberToBulgarianWords(total);
  const fullName = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ');
  const payment = tx.payment_method === 'cash'
    ? 'В брой'
    : `По банков път - ${tx.bank_name} IBAN: ${tx.bank_account} BIC: ${tx.bank_bic}`;
  const paymentContract = tx.payment_method === 'cash'
    ? 'в брой при подписване на договора'
    : `по банков път на IBAN ${tx.bank_account}, банка ${tx.bank_name}, BIC ${tx.bank_bic}`;

  const tableBody = [
    [
      { text: '№',               bold: true, fontSize: 8 },
      { text: 'Наименование',    bold: true, fontSize: 8 },
      { text: 'Мярка',           bold: true, fontSize: 8 },
      { text: 'Количество',      bold: true, fontSize: 8 },
      { text: 'Ед. цена',        bold: true, fontSize: 8 },
      { text: 'Обща стойност',   bold: true, fontSize: 8 },
    ],
    ...items.map((it, i) => [
      { text: String(i + 1),                                                       fontSize: 8 },
      { text: `${it.nomenclatures?.name} (${it.nomenclatures?.waste_code})`,       fontSize: 8 },
      { text: it.nomenclatures?.unit || 'кг',                                      fontSize: 8 },
      { text: Number(it.quantity).toFixed(3),                                      fontSize: 8 },
      { text: Number(it.unit_price).toFixed(4),                                    fontSize: 8 },
      { text: Number(it.total_price).toFixed(2),                                   fontSize: 8 },
    ]),
    [
      { text: 'ОБЩО:', colSpan: 5, alignment: 'right', bold: true, fontSize: 8 },
      {}, {}, {}, {},
      { text: `${total.toFixed(2)} лв.`, bold: true, fontSize: 8 },
    ],
  ];

  const sectionStyle = { margin: [0, 0, 0, 8] as [number,number,number,number] };
  const titleStyle = { fontSize: 11, bold: true, alignment: 'center' as const, margin: [0, 0, 0, 4] as [number,number,number,number] };
  const smallStyle = { fontSize: 7, lineHeight: 1.3 };
  const sigRow = {
    columns: [
      { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: 'Купувач', fontSize: 7, alignment: 'center' as const }] },
      { width: '*', text: '' },
      { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: 'Продавач', fontSize: 7, alignment: 'center' as const }] },
    ],
    margin: [0, 10, 0, 0] as [number,number,number,number],
  };

  function bordered(content: any[]) {
    return {
      ...sectionStyle,
      table: { widths: ['*'], body: [[{ stack: content, margin: [5, 5, 5, 5] }]] },
    };
  }

  return {
    defaultStyle: { font: 'NotoSans', fontSize: 8 },
    pageSize: 'A4' as const,
    pageMargins: [30, 30, 30, 30] as [number,number,number,number],
    content: [
      // ПИС
      bordered([
        { text: `ПОКУПКО-ИЗПЛАЩАТЕЛНА СМЕТКА (ПИС) № ${tx.receipt_number}`, ...titleStyle },
        {
          columns: [
            { text: 'Прогрестрейд ЕООД, гр. София, ул. проф. Иван Георгов №1' },
            { text: `Дата: ${date}`, alignment: 'right' as const },
          ],
          margin: [0, 0, 0, 2] as [number,number,number,number],
        },
        {
          columns: [
            { text: 'ЕИК: 130975863 / ДДС №: BG130975863' },
            { text: `Оператор: ${tx.operator_name || ''}`, alignment: 'right' as const },
          ],
          margin: [0, 0, 0, 4] as [number,number,number,number],
        },
        { text: `Доставчик: ${fullName}, ЕГН: ${c.egn}` },
        { text: `ЛК №: ${c.id_card_number}, изд. от ${c.id_card_issued_by} на ${c.id_card_issued_date}, валидна до ${c.id_card_expiry}` },
        { text: `Адрес: ${c.address}, гр. ${c.city}, общ. ${c.municipality}`, margin: [0, 0, 0, 4] as [number,number,number,number] },
        {
          table: {
            headerRows: 1,
            widths: ['5%', '39%', '9%', '13%', '13%', '21%'],
            body: tableBody,
          },
        },
        { text: `Словом: ${totalWords}`, italics: true, margin: [0, 3, 0, 2] as [number,number,number,number] },
        { text: `Начин на плащане: ${payment}` },
        sigRow,
      ]),

      // Декларация
      bordered([
        { text: 'ДЕКЛАРАЦИЯ ЗА ПРОИЗХОД НА ОТПАДЪЦИ', ...titleStyle },
        {
          ...smallStyle,
          text: [
            `Долуподписаният(ата) ${fullName}, ЕГН ${c.egn}, притежател на ЛК № ${c.id_card_number}, издадена от ${c.id_card_issued_by} на ${c.id_card_issued_date}, с адрес ${c.address}, гр. ${c.city}, общ. ${c.municipality}, `,
            `декларирам, че описаните в ПИС № ${tx.receipt_number} от ${date} отпадъци са моя собственост, произхождат от законен източник, не са придобити чрез престъпление, не са общинска или държавна собственост, не са част от електрически, електронен или друг уред, `,
            `който подлежи на връщане по реда на ЗУО. Известно ми е, че за деклариране на неверни данни нося наказателна отговорност по чл. 313 от НК.`,
          ],
        },
        {
          columns: [
            { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: `Дата: ${date}`, fontSize: 7, alignment: 'center' as const }] },
            { width: '*', text: '' },
            { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: 'Декларатор', fontSize: 7, alignment: 'center' as const }] },
          ],
          margin: [0, 10, 0, 0] as [number,number,number,number],
        },
      ]),

      // Договор
      bordered([
        { text: `ДОГОВОР № ${tx.contract_number || tx.receipt_number}`, ...titleStyle },
        {
          ...smallStyle,
          text: `Днес, ${date} г., в гр. София, между "Прогрестрейд" ЕООД, ЕИК 130975863, със седалище: гр. София, ул. проф. Иван Георгов №1, наричано КУПУВАЧ, и ${fullName}, ЕГН ${c.egn}, ЛК № ${c.id_card_number}, адрес ${c.address}, гр. ${c.city}, наричан ПРОДАВАЧ, се сключи настоящият договор.`,
          margin: [0, 0, 0, 3] as [number,number,number,number],
        },
        {
          ...smallStyle,
          text: [
            `Чл. 1. ПРОДАВАЧЪТ продава, а КУПУВАЧЪТ купува отпадъците от ПИС № ${tx.receipt_number} от ${date} на стойност ${total.toFixed(2)} лв. (${totalWords}).\n`,
            `Чл. 2. Плащането се извършва ${paymentContract}.\n`,
            `Чл. 3. ПРОДАВАЧЪТ декларира законен произход и носи отговорност за верността на данните.\n`,
            `Чл. 4. Договорът се състави в два еднообразни екземпляра — по един за всяка страна.`,
          ],
        },
        {
          columns: [
            { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: 'ПРОДАВАЧ', fontSize: 7, alignment: 'center' as const }] },
            { width: '*', text: '' },
            { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5 }] }, { text: 'КУПУВАЧ', fontSize: 7, alignment: 'center' as const }] },
          ],
          margin: [0, 10, 0, 0] as [number,number,number,number],
        },
      ]),
    ],
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let fontVfs: Record<string, string>;
  try {
    fontVfs = getVfs();
  } catch (e: any) {
    return new Response(
      `Font error: ${e?.message}\nRun 'node scripts/download-fonts.js' before build.`,
      { status: 500 }
    );
  }

  const supabase = createServerSupabase();
  const { data: tx, error } = await supabase
    .from('transactions')
    .select('*, customers(*), transaction_items(*, nomenclatures(*))')
    .eq('id', id)
    .single();

  if (error || !tx) return new Response('Not found', { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require('pdfmake/build/pdfmake');
  pdfMake.vfs = fontVfs;
  pdfMake.fonts = {
    NotoSans: {
      normal:      'NotoSans-Regular.ttf',
      bold:        'NotoSans-Bold.ttf',
      italics:     'NotoSans-Regular.ttf',
      bolditalics: 'NotoSans-Bold.ttf',
    },
  };

  const docDef = buildDocDef(tx);
  const buffer: Buffer = await new Promise((resolve, reject) => {
    pdfMake.createPdf(docDef).getBuffer((buf: Buffer) => {
      if (!buf) reject(new Error('pdfmake returned empty buffer'));
      else resolve(buf);
    });
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="PIS-${tx.receipt_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
