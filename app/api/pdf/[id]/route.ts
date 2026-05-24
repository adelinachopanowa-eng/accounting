import { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, BorderStyle, WidthType, AlignmentType,
  TableLayoutType, HeightRule, ShadingType,
} from 'docx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const NONE: any = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const THIN: any = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const NO_BORDERS: any = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const ALL_BORDERS: any = { top: THIN, bottom: THIN, left: THIN, right: THIN, insideHorizontal: THIN, insideVertical: THIN };

function R(text: string, size = 16, bold = false): TextRun {
  return new TextRun({ text, bold, size, font: 'Times New Roman' });
}
function B(text: string, size = 18): TextRun {
  return R(text, size, true);
}
function p(runs: TextRun[], align = AlignmentType.LEFT, after = 60): Paragraph {
  return new Paragraph({ children: runs, alignment: align, spacing: { after } });
}
function empty(): Paragraph {
  return new Paragraph({ children: [R('')], spacing: { after: 40 } });
}

function sigLine(left: string, right: string): Table {
  const cell = (text: string) => new TableCell({
    borders: { top: NONE, bottom: THIN, left: NONE, right: NONE },
    children: [p([R(text, 14)], AlignmentType.CENTER, 0)],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [cell(left), cell(right)] })],
  });
}

function buildDoc(tx: any): Document {
  const cu    = tx.customers || {};
  const items = (tx.transaction_items || []) as any[];
  const total = Number(tx.total_amount || 0);
  const date  = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
  const words = numberToBulgarianWords(total);
  const name  = [cu.first_name, cu.middle_name, cu.last_name].filter(Boolean).join(' ');

  const COL_W = [500, 4900, 900, 1400, 1500, 1500];

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: ['№', 'Наименование на предадените отпадъци', 'Мярка', 'Количество', 'Един. цена', 'Обща стойност'].map((h, i) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: 'DDDDDD' },
        borders: ALL_BORDERS,
        width: { size: COL_W[i], type: WidthType.DXA },
        children: [p([B(h, 14)], AlignmentType.CENTER, 0)],
      })
    ),
  });

  const itemRows = items.map((it, i) =>
    new TableRow({
      height: { value: 280, rule: HeightRule.ATLEAST },
      children: [
        String(i + 1),
        `${it.nomenclatures?.name || ''} ${it.nomenclatures?.waste_code || ''}`,
        it.nomenclatures?.unit || 'kg',
        Number(it.quantity).toFixed(3),
        Number(it.unit_price).toFixed(4),
        Number(it.total_price).toFixed(2),
      ].map((cell, ci) =>
        new TableCell({
          borders: ALL_BORDERS,
          width: { size: COL_W[ci], type: WidthType.DXA },
          children: [p([R(cell, 14)], ci >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT, 0)],
        })
      ),
    })
  );

  const twoCol = (left: string, right: string) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({ borders: NO_BORDERS, width: { size: 60, type: WidthType.PERCENTAGE }, children: [p([R(left)], AlignmentType.LEFT, 0)] }),
      new TableCell({ borders: NO_BORDERS, width: { size: 40, type: WidthType.PERCENTAGE }, children: [p([B(right)], AlignmentType.RIGHT, 0)] }),
    ]})],
  });

  const headerBox = (leftText: string, leftSize: number, rightText: string) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: THIN, bottom: THIN, left: THIN, right: THIN },
    rows: [new TableRow({ children: [
      new TableCell({ borders: { top: NONE, bottom: NONE, left: NONE, right: NONE }, width: { size: 60, type: WidthType.PERCENTAGE }, children: [p([B(leftText, leftSize)], AlignmentType.LEFT, 0)] }),
      new TableCell({ borders: { top: NONE, bottom: NONE, left: NONE, right: NONE }, width: { size: 40, type: WidthType.PERCENTAGE }, children: [p([R(rightText, 13)], AlignmentType.RIGHT, 0)] }),
    ]})],
  });

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 700, bottom: 700, left: 800, right: 800 } } },
      children: [
        // Header
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: NO_BORDERS,
          rows: [new TableRow({ children: [
            new TableCell({ borders: NO_BORDERS, width: { size: 80, type: WidthType.PERCENTAGE }, children: [
              p([B('Прогрестрейд ЕООд', 16)], AlignmentType.LEFT, 0),
              p([R('София, ул. Професор Иван Георгов №1  |  ИН по ЗДДС: BG130975863  |  ИН: 130975863', 14)], AlignmentType.LEFT, 0),
            ]}),
            new TableCell({ borders: NO_BORDERS, width: { size: 20, type: WidthType.PERCENTAGE }, children: [p([B('Склад стоки', 16)], AlignmentType.RIGHT, 0)] }),
          ]})],
        }),
        empty(),

        // ── ПИС
        headerBox('Покупко - изплащателна сметка', 20, 'No и Дата на разрешението: 12-ДО-00001270-00/05.06.2013 г.'),
        p([B(`No:  ${tx.receipt_number}`, 18), R(`          Дата:  ${date} г.`)], AlignmentType.LEFT, 40),
        p([R(`Подписаният  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}`)], AlignmentType.LEFT, 40),
        p([R(`удостоверявам, че предадох:  адрес ${cu.address || ''}`)], AlignmentType.LEFT, 60),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...itemRows] }),
        empty(),
        twoCol(`Словом общо: ${words}`, `Сума за плащане:  ${total.toFixed(2)} лв.`),
        empty(),
        sigLine(`Изплатил: ${tx.operator_name || ''}`, 'Получих сумата: (подпис на лицето, предало отпадъка)'),
        empty(),

        // ── Декларация
        headerBox('Декларация за произход на отпадъци от черни и цветни метали', 18, 'Образец № 1 към чл. 39, ал. 4 от ЗУО'),
        p([R(`Долуподписаният/ата  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}  адрес ${cu.address || ''}`)], AlignmentType.LEFT, 40),
        p([R('декларирам, че продавам собствени отпадъци от черни и цветни метали с битов характер, представляващи:')], AlignmentType.LEFT, 40),
        ...items.map((it, i) => p([R(`${i + 1}  ${it.nomenclatures?.name || ''}  ${Number(it.quantity).toFixed(3)}  ${numberToBulgarianWords(Number(it.quantity))} ${it.nomenclatures?.unit || 'kg'} и 00 gr`)], AlignmentType.LEFT, 40)),
        p([R('Известна ми е наказателната отговорност, по чл. 313 от Наказателния кодекс за деклариране на неверни данни.')], AlignmentType.LEFT, 40),
        p([R(`Декларирам, че с настоящата сума получена в брой по ПИС №${tx.receipt_number}, не надвишавам сумата от 613.55 EUR, получени от предаване на ОЧЦМ във връзка с чл.38 ал.5 от ЗУО.`)], AlignmentType.LEFT, 60),
        sigLine(`Дата: ${date}  гр./с.: ${cu.city || 'София'}`, `Декларатор: ${name}`),
        empty(),

        // ── Договор
        p([B(`Договор №${tx.contract_number || tx.receipt_number} / ${date} г.`, 18)], AlignmentType.CENTER, 60),
        p([R(`Днес, ${date} г. в ${cu.city || 'София'}, се сключи този договор за продажба между:`)], AlignmentType.LEFT, 40),
        p([R(`Прогрестрейд ЕООД със седалище и адрес на управление София, ул. професор Иван Георгов №1, ИН: 130975863, представлявано от ${tx.operator_name || ''}, наричан по-долу Купувач и`)], AlignmentType.LEFT, 40),
        p([R(`${name} с адрес ${cu.address || ''}, ЕГН: ${cu.egn || ''}, л. к. ${cu.id_card_number || ''}, издадена от ${cu.id_card_issued_by || ''}, на ${cu.id_card_issued_date || ''}, наричан по-долу Продавач`)], AlignmentType.LEFT, 60),
        p([B('Предмет на договора.'), R(` Страните се споразумяха за следното: Продавача прехвърля на Купувача правото на собственост и му предава стоката, описана в ПИС №${tx.receipt_number} / ${date}, срещу задължението на Купувача да му заплати уговорената цена.`)], AlignmentType.LEFT, 40),
        ...(tx.payment_method !== 'cash' ? [p([R(`Плащането ще се извърши по сметка: ${tx.bank_account || ''}  ${tx.bank_name || ''}  ${tx.bank_bic || ''}`)], AlignmentType.LEFT, 40)] : []),
        p([B('Общи положения.'), R(' Купувачът има право на обезщетение в размер на платената от него цена по този договор, ако бъде лишен от държането или бъде съдебно отстранен от закупените стоки поради това, че трети лица имат претенции за собствеността върху тях или неистинност на гореподписаната декларация.')], AlignmentType.LEFT, 40),
        p([R('Този договор се състави и подписа в два еднакви екземпляра, по един за всяка от страните.')], AlignmentType.LEFT, 60),
        sigLine(`Купувач: ${tx.operator_name || ''}`, `Продавач: ${name}`),
      ],
    }],
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
    const buf = await Packer.toBuffer(buildDoc(tx));
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="PIS-${tx.receipt_number}.docx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return new Response(`DOCX error: ${e?.message}\n${e?.stack}`, { status: 500 });
  }
}
