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

const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };

function bold(text: string, size = 18) {
  return new TextRun({ text, bold: true, size, font: 'Times New Roman' });
}
function normal(text: string, size = 16) {
  return new TextRun({ text, size, font: 'Times New Roman' });
}
function para(runs: TextRun[], align = AlignmentType.LEFT, spacingAfter = 60) {
  return new Paragraph({ children: runs, alignment: align, spacing: { after: spacingAfter } });
}
function emptyLine() {
  return new Paragraph({ children: [normal('')], spacing: { after: 40 } });
}
function sigLine(left: string, right: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER, insideH: NONE_BORDER, insideV: NONE_BORDER },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: NONE_BORDER, bottom: THIN_BORDER, left: NONE_BORDER, right: NONE_BORDER },
            children: [para([normal(left, 14)], AlignmentType.CENTER, 0)],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: NONE_BORDER, bottom: THIN_BORDER, left: NONE_BORDER, right: NONE_BORDER },
            children: [para([normal(right, 14)], AlignmentType.CENTER, 0)],
          }),
        ],
      }),
    ],
  });
}

function buildDoc(tx: any): Document {
  const cu    = tx.customers || {};
  const items = (tx.transaction_items || []) as any[];
  const total = Number(tx.total_amount || 0);
  const date  = format(new Date(tx.transaction_date), 'dd.MM.yyyy');
  const words = numberToBulgarianWords(total);
  const name  = [cu.first_name, cu.middle_name, cu.last_name].filter(Boolean).join(' ');

  // ── Items table rows
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    height: { value: 300, rule: HeightRule.ATLEAST },
    children: ['No', 'Наименование на предадените отпадъци', 'Мярка', 'Количество', 'Един. цена', 'Обща стойност'].map((h, i) =>
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: 'DDDDDD' },
        borders: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER },
        width: { size: [4, 40, 8, 12, 13, 13][i] * 100, type: WidthType.DXA },
        children: [para([bold(h, 14)], AlignmentType.CENTER, 0)],
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
          borders: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER },
          width: { size: [4, 40, 8, 12, 13, 13][ci] * 100, type: WidthType.DXA },
          children: [para([normal(cell, 14)], ci >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT, 0)],
        })
      ),
    })
  );

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...itemRows],
  });

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 700, bottom: 700, left: 800, right: 800 },
        },
      },
      children: [
        // ── Хедър
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER, insideH: NONE_BORDER, insideV: NONE_BORDER },
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: 80, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [
                para([bold('Прогрестрейд ЕООД', 16)], AlignmentType.LEFT, 0),
                para([normal('София, ул. Професор Иван Георгов №1  |  ИН по ЗДДС: BG130975863  |  ИН: 130975863', 14)], AlignmentType.LEFT, 0),
              ],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([bold('Склад стоки', 16)], AlignmentType.RIGHT, 0)],
            }),
          ]})],
        }),
        emptyLine(),

        // ════════════════════════════════════════════════════════════
        // ── ПИС
        // ════════════════════════════════════════════════════════════
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER, insideH: NONE_BORDER, insideV: NONE_BORDER },
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([bold('Покупко - изплащателна сметка', 20)], AlignmentType.LEFT, 0)],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([normal('No и Дата на разрешението: 12-ДО-00001270-00/05.06.2013 г.', 13)], AlignmentType.RIGHT, 0)],
            }),
          ]})],
        }),
        para([bold(`No:  ${tx.receipt_number}`, 18), normal(`          Дата:  ${date} г.`, 16)], AlignmentType.LEFT, 40),
        para([normal(`Подписаният  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}`)], AlignmentType.LEFT, 40),
        para([normal(`удостоверявам, че предадох:  адрес ${cu.address || ''}`)], AlignmentType.LEFT, 60),
        itemsTable,
        emptyLine(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER, insideH: NONE_BORDER, insideV: NONE_BORDER },
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([normal(`Словом общо: ${words}`)], AlignmentType.LEFT, 0)],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([bold(`Сума за плащане:  ${total.toFixed(2)} лв.`)], AlignmentType.RIGHT, 0)],
            }),
          ]})],
        }),
        emptyLine(),
        sigLine(`Изплатил: ${tx.operator_name || ''}`, 'Получих сумата: (подпис на лицето, предало отпадъка)'),
        emptyLine(),

        // ════════════════════════════════════════════════════════════
        // ── ДЕКЛАРАЦИЯ
        // ════════════════════════════════════════════════════════════
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER, insideH: NONE_BORDER, insideV: NONE_BORDER },
          rows: [new TableRow({ children: [
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([bold('Декларация за произход на отпадъци от черни и цветни метали', 18)], AlignmentType.LEFT, 0)],
            }),
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              borders: { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER },
              children: [para([normal('Образец № 1 към чл. 39, ал. 4 от ЗУО', 13)], AlignmentType.RIGHT, 0)],
            }),
          ]})],
        }),
        para([normal(`Долуподписаният/ата  ${name}  ЕГН ${cu.egn || ''}  град (с) ${cu.city || ''}  община ${cu.municipality || ''}  адрес ${cu.address || ''}`)], AlignmentType.LEFT, 40),
        para([normal('декларирам, че продавам собствени отпадъци от черни и цветни метали с битов характер, представляващи:')], AlignmentType.LEFT, 40),
        ...items.map((it, i) => {
          const qty = Number(it.quantity);
          return para([normal(`${i + 1}  ${it.nomenclatures?.name || ''}  ${qty.toFixed(3)}  ${numberToBulgarianWords(qty)} ${it.nomenclatures?.unit || 'kg'} и 00 gr`)], AlignmentType.LEFT, 40);
        }),
        para([normal('Известна ми е наказателната отговорност, по чл. 313 от Наказателния кодекс за деклариране на неверни данни.')], AlignmentType.LEFT, 40),
        para([normal(`Декларирам, че с настоящата сума получена в брой по ПИС №${tx.receipt_number}, не надвишавам сумата от 613.55 EUR, получени от предаване на ОЧЦМ във връзка с чл.38 ал.5 от ЗУО.`)], AlignmentType.LEFT, 60),
        sigLine(`Дата: ${date}  гр./с.: ${cu.city || 'София'}`, `Декларатор: ${name}`),
        emptyLine(),

        // ════════════════════════════════════════════════════════════
        // ── ДОГОВОР
        // ════════════════════════════════════════════════════════════
        para([bold(`Договор №${tx.contract_number || tx.receipt_number} / ${date} г.`, 18)], AlignmentType.CENTER, 60),
        para([normal(`Днес, ${date} г. в ${cu.city || 'София'}, се сключи този договор за продажба между:`)], AlignmentType.LEFT, 40),
        para([normal(`Прогрестрейд ЕООД със седалище и адрес на управление София, ул. професор Иван Георгов №1, ИН: 130975863, представлявано от ${tx.operator_name || ''}, наричан по-долу Купувач и`)], AlignmentType.LEFT, 40),
        para([normal(`${name} с адрес ${cu.address || ''}, ЕГН: ${cu.egn || ''}, л. к. ${cu.id_card_number || ''}, издадена от ${cu.id_card_issued_by || ''}, на ${cu.id_card_issued_date || ''}, наричан по-долу Продавач`)], AlignmentType.LEFT, 60),
        para([bold('Предмет на договора.', 16), normal(` Страните се споразумяха за следното: Продавача прехвърля на Купувача правото на собственост и му предава стоката, описана по-горе в ПИС №${tx.receipt_number} / ${date}, която е неразделна част от този договор, срещу задължението на Купувача да му заплати уговорената цена.`)], AlignmentType.LEFT, 40),
        ...(tx.payment_method !== 'cash' ? [para([normal(`Плащането ще се извърши по сметка: ${tx.bank_account || ''}  ${tx.bank_name || ''}  ${tx.bank_bic || ''}`)], AlignmentType.LEFT, 40)] : []),
        para([bold('Общи положения.', 16), normal(' Купувачът има право на обезщетение в размер на платената от него цена по този договор, ако бъде лишен от държането или бъде съдебно отстранен от закупените стоки поради това, че трети лица имат претенции за собствеността върху тях или неистинност на гореподписаната декларация.')], AlignmentType.LEFT, 40),
        para([normal('Този договор се състави и подписа в два еднакви екземпляра, по един за всяка от страните.')], AlignmentType.LEFT, 60),
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
    const doc = buildDoc(tx);
    const buf = await Packer.toBuffer(doc);
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
