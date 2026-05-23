import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CDN_REGULAR = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf';
const CDN_BOLD    = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf';

let vfsCache: Record<string, string> | null = null;

async function loadFont(name: string, cdnUrl: string): Promise<Buffer> {
  const tmpPath    = `/tmp/${name}`;
  const publicPath = path.join(process.cwd(), 'public', 'fonts', name);
  if (existsSync(tmpPath))    return readFileSync(tmpPath);
  if (existsSync(publicPath)) {
    const buf = readFileSync(publicPath);
    try { writeFileSync(tmpPath, buf); } catch {}
    return buf;
  }
  const res = await fetch(cdnUrl);
  if (!res.ok) throw new Error(`CDN ${res.status} for ${cdnUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 50000) throw new Error(`Font too small (${buf.length} bytes) — likely error page`);
  try { writeFileSync(tmpPath, buf); } catch {}
  return buf;
}

async function getVfs() {
  if (vfsCache) return vfsCache;
  const [regular, bold] = await Promise.all([
    loadFont('NotoSans-Regular.ttf', CDN_REGULAR),
    loadFont('NotoSans-Bold.ttf',    CDN_BOLD),
  ]);
  vfsCache = {
    'NotoSans-Regular.ttf': regular.toString('base64'),
    'NotoSans-Bold.ttf':    bold.toString('base64'),
  };
  return vfsCache;
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
    : `по банков път IBAN ${tx.bank_account}, банка ${tx.bank_name}, BIC ${tx.bank_bic}`;

  function sigRow(left: string, right: string) {
    return {
      columns: [
        { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.5 }] }, { text: left,  fontSize: 7, alignment: 'center' as const }] },
        { width: '*', text: '' },
        { width: '45%', stack: [{ canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.5 }] }, { text: right, fontSize: 7, alignment: 'center' as const }] },
      ],
      margin: [0, 10, 0, 0] as [number,number,number,number],
    };
  }

  function section(content: any[]) {
    return {
      margin: [0, 0, 0, 8] as [number,number,number,number],
      table: { widths: ['*'], body: [[{ stack: content, margin: [6, 6, 6, 6] }]] },
    };
  }

  const title = (text: string) => ({ text, fontSize: 11, bold: true, alignment: 'center' as const, margin: [0, 0, 0, 4] as [number,number,number,number] });
  const row2  = (l: string, r: string) => ({ columns: [{ text: l }, { text: r, alignment: 'right' as const }], margin: [0, 0, 0, 2] as [number,number,number,number] });
  const small = { fontSize: 7, lineHeight: 1.3 };

  return {
    defaultStyle: { font: 'NotoSans', fontSize: 8 },
    pageSize: 'A4' as const,
    pageMargins: [30, 30, 30, 30] as [number,number,number,number],
    content: [
      section([
        title(`ПОКУПКО-ИЗПЛАЩАТЕЛНА СМЕТКА (ПИС) № ${tx.receipt_number}`),
        row2('Прогрестрейд ЕООД, гр. София, ул. проф. Иван Георгов №1', `Дата: ${date}`),
        row2('ЕИК: 130975863 / ДДС №: BG130975863', `Оператор: ${tx.operator_name || ''}`),
        { text: `Доставчик: ${fullName}, ЕГН: ${c.egn}`, margin: [0,4,0,1] as [number,number,number,number] },
        { text: `ЛК №: ${c.id_card_number}, изд. от ${c.id_card_issued_by} на ${c.id_card_issued_date}, валидна до ${c.id_card_expiry}` },
        { text: `Адрес: ${c.address}, гр. ${c.city}, общ. ${c.municipality}`, margin: [0,0,0,4] as [number,number,number,number] },
        {
          table: {
            headerRows: 1,
            widths: ['5%','39%','9%','13%','13%','21%'],
            body: [
              [
                { text: '№',             bold:true, fontSize:8 },
                { text: 'Наименование',  bold:true, fontSize:8 },
                { text: 'Мярка',         bold:true, fontSize:8 },
                { text: 'Количество',  bold:true, fontSize:8 },
                { text: 'Ед. цена',      bold:true, fontSize:8 },
                { text: 'Обща стойн.',   bold:true, fontSize:8 },
              ],
              ...items.map((it,i) => [
                { text: String(i+1), fontSize:8 },
                { text: `${it.nomenclatures?.name} (${it.nomenclatures?.waste_code})`, fontSize:8 },
                { text: it.nomenclatures?.unit||'кг', fontSize:8 },
                { text: Number(it.quantity).toFixed(3), fontSize:8 },
                { text: Number(it.unit_price).toFixed(4), fontSize:8 },
                { text: Number(it.total_price).toFixed(2), fontSize:8 },
              ]),
              [
                { text:'ОБЩО:', colSpan:5, alignment:'right', bold:true, fontSize:8 }, {},{},{},{},
                { text:`${total.toFixed(2)} лв.`, bold:true, fontSize:8 },
              ],
            ],
          },
        },
        { text:`Словом: ${totalWords}`, italics:true, margin:[0,3,0,2] as [number,number,number,number] },
        { text:`Начин на плащане: ${payment}` },
        sigRow('Купувач: ________________','Продавач: ________________'),
      ]),

      section([
        title('ДЕКЛАРАЦИЯ ЗА ПРОИЗХОД НА ОТПАДЪЦИ'),
        {
          ...small,
          text: `Долуподписаният(ата) ${fullName}, ЕГН ${c.egn}, притежател на ЛК № ${c.id_card_number}, издадена от ${c.id_card_issued_by} на ${c.id_card_issued_date}, с адрес ${c.address}, гр. ${c.city}, общ. ${c.municipality}, декларирам, че описаните в ПИС № ${tx.receipt_number} от ${date} отпадъци са моя собственост, произхождат от законен източник, не са придобити чрез престъпление, не са общинска или държавна собственост, не са част от електрически, електронен или друг уред, който подлежи на връщане по реда на ЗУО. Известно ми е, че за деклариране на неверни данни нося наказателна отговорност по чл. 313 от НК.`,
        },
        sigRow(`Дата: ${date}`, 'Декларатор: ________________'),
      ]),

      section([
        title(`ДОГОВОР № ${tx.contract_number || tx.receipt_number}`),
        {
          ...small,
          text: `Днес, ${date} г., в гр. София, между "Прогрестрейд" ЕООД, ЕИК 130975863, със седалище: гр. София, ул. проф. Иван Георгов №1, наричано КУПУВАЧ, и ${fullName}, ЕГН ${c.egn}, ЛК № ${c.id_card_number}, адрес ${c.address}, гр. ${c.city}, наричан ПРОДАВАЧ, се сключи настоящият договор.`,
          margin: [0,0,0,3] as [number,number,number,number],
        },
        {
          ...small,
          text: [
            `Чл. 1. ПРОДАВАЧЪТ продава, а КУПУВАЧЪТ купува отпадъците от ПИС № ${tx.receipt_number} от ${date} на стойност ${total.toFixed(2)} лв. (${totalWords}).\n`,
            `Чл. 2. Плащането се извършва ${paymentContract}.\n`,
            `Чл. 3. ПРОДАВАЧЪТ декларира законен произход на отпадъците и носи отговорност за верността на данните.\n`,
            `Чл. 4. Договорът се състави в два еднообразни екземпляра — по един за всяка страна.`,
          ],
        },
        sigRow('ПРОДАВАЧ: ________________', 'КУПУВАЧ: ________________'),
      ]),
    ],
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let fontVfs: Record<string, string>;
  try {
    fontVfs = await getVfs();
  } catch (e: any) {
    return new Response(`Font load error: ${e?.message}`, { status: 500 });
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
  pdfMake.vfs   = fontVfs;
  pdfMake.fonts = {
    NotoSans: {
      normal:      'NotoSans-Regular.ttf',
      bold:        'NotoSans-Bold.ttf',
      italics:     'NotoSans-Regular.ttf',
      bolditalics: 'NotoSans-Bold.ttf',
    },
  };

  const buffer: Buffer = await new Promise((resolve, reject) => {
    pdfMake.createPdf(buildDocDef(tx)).getBuffer((buf: Buffer) => {
      if (!buf) reject(new Error('empty buffer'));
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
