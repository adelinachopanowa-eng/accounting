import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

const OPERATOR = 'Милан Иванов Шопов';
const COMPANY = 'Прогрестрейд ЕООД';
const COMPANY_ADDR = 'София, ул. професор Иван Георгов №1';
const COMPANY_VAT = 'BG130975863';
const COMPANY_EIK = '130975863';
const PERMISSION = '12-ДО-00001270-00/05.06.2013 г.';
const WAREHOUSE = '304 Склад стоки';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto/files/roboto-cyrillic-400-normal.woff2', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto/files/roboto-cyrillic-700-normal.woff2', fontWeight: 'bold' },
  ],
});

// ---- Number to Bulgarian words ----
const ONES   = ['', 'един', 'два', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет'];
const ONES_F = ['', 'една', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет'];
const TEENS  = ['десет', 'единадесет', 'дванадесет', 'тринадесет', 'четиринадесет', 'петнадесет', 'шестнадесет', 'седемнадесет', 'осемнадесет', 'деветнадесет'];
const TENS   = ['', '', 'двадесет', 'тридесет', 'четиридесет', 'петдесет', 'шестдесет', 'седемдесет', 'осемдесет', 'деветдесет'];
const HUNDS  = ['', 'сто', 'двеста', 'триста', 'четиристотин', 'петстотин', 'шестстотин', 'седемстотин', 'осемстотин', 'деветстотин'];

function u100(n: number, fem = false): string {
  if (!n) return '';
  const h = Math.floor(n / 100), r = n % 100;
  let s = h ? HUNDS[h] : '';
  if (!r) return s;
  if (r < 10)  return s + (s ? ' и ' : '') + (fem ? ONES_F : ONES)[r];
  if (r < 20)  return s + (s ? ' и ' : '') + TEENS[r - 10];
  const t = Math.floor(r / 10), o = r % 10;
  return s + (s ? ' ' : '') + TENS[t] + (o ? ' и ' + (fem ? ONES_F : ONES)[o] : '');
}

function intWords(n: number, abbr = false): string {
  if (!n) return 'нула';
  const th = Math.floor(n / 1000), r = n % 1000;
  let s = '';
  if (th) {
    if (th === 1) s = abbr ? 'хил.' : 'хиляда';
    else if (th === 2) s = 'две ' + (abbr ? 'хил.' : 'хиляди');
    else s = u100(th, true) + ' ' + (abbr ? 'хил.' : 'хиляди');
  }
  if (r) s += (th ? (r < 100 ? ' и ' : ' ') : '') + u100(r);
  return s;
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function amountWords(n: number): string {
  const lv = Math.floor(n), st = Math.round((n - lv) * 100);
  return cap(intWords(lv)) + ' лв. и ' + String(st).padStart(2, '0') + ' ст.';
}

function qtyWords(n: number): string {
  const kg = Math.floor(n), gr = Math.round((n - kg) * 100);
  return cap(intWords(kg, true)) + ' kg и ' + String(gr).padStart(2, '0') + ' gr';
}

function fmtD(d: string): string {
  if (!d) return '';
  if (d.includes('-')) { const [y,m,dd] = d.split('-'); return `${dd}.${m}.${y}`; }
  return d;
}

function fmtN(n: number, dec = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ---- Styles ----
const s = StyleSheet.create({
  page:  { padding: '8mm 12mm 14mm 12mm', fontSize: 8, fontFamily: 'Roboto', color: '#000' },

  // Header
  hdrRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 0.5, borderColor: '#000', paddingBottom: 2, marginBottom: 3 },
  hdrBold: { fontWeight: 'bold', fontSize: 8.5 },

  // ПИС title row
  row3: { flexDirection: 'row', alignItems: 'flex-start' },
  pisLeft:  { width: '18%', fontSize: 7 },
  pisMid:   { width: '54%', textAlign: 'center' },
  pisRight: { width: '28%', textAlign: 'right', fontSize: 6.5 },
  pisTitle: { fontSize: 11, fontWeight: 'bold' },

  // ПИС no/date row
  noRow: { flexDirection: 'row', marginBottom: 3 },
  noCell: { fontWeight: 'bold', fontSize: 9 },

  ln: { marginBottom: 1.5 },

  // Table
  tbl:  { borderWidth: 0.5, borderColor: '#000', marginTop: 2, marginBottom: 2 },
  tr:   { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#000' },
  trL:  { flexDirection: 'row' },
  th:   { padding: '2 2', borderRightWidth: 0.5, borderColor: '#000', fontWeight: 'bold', fontSize: 7, textAlign: 'center' },
  td:   { padding: '2 3', borderRightWidth: 0.5, borderColor: '#000', fontSize: 7.5 },
  tdX:  { padding: '2 3', fontSize: 7.5 },
  c0: { width: '5%' },
  c1: { width: '43%' },
  c2: { width: '8%', textAlign: 'center' },
  c3: { width: '14%', textAlign: 'right' },
  c4: { width: '13%', textAlign: 'right' },
  c5: { width: '17%', textAlign: 'right' },

  // Словом / Сума row
  slovomRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },

  // Signature
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  sigBox: { width: '46%' },
  sigLabel: { marginBottom: 8 },
  sigLine: { borderBottomWidth: 0.5, borderColor: '#000', marginBottom: 1 },
  sigName: { textAlign: 'center', fontSize: 7.5 },
  sigNote: { textAlign: 'center', fontSize: 6.5 },

  divider: { borderBottomWidth: 0.5, borderColor: '#000', marginVertical: 3 },

  // Declaration
  declTR: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, alignItems: 'flex-start' },
  declTitle: { fontWeight: 'bold', fontSize: 8.5, flex: 1, textAlign: 'center' },
  declRef: { fontSize: 6.5, width: '32%', textAlign: 'right' },

  // Contract
  ctTitle: { fontWeight: 'bold', fontSize: 9, textAlign: 'center', marginBottom: 2 },
  ctRow: { flexDirection: 'row', marginBottom: 1.5 },
  ctText: { marginBottom: 1.5, lineHeight: 1.35 },

  // Footer
  footer: { position: 'absolute', bottom: '6mm', left: '12mm', right: '12mm', flexDirection: 'row', justifyContent: 'space-between', fontSize: 6.5, borderTopWidth: 0.5, borderColor: '#000', paddingTop: 1.5 },
});

export default function TransactionPDF({ transaction }: { transaction: any }) {
  const c = transaction.customers || {};
  const items = transaction.transaction_items || [];
  const total = Number(transaction.total_amount || 0);
  const txDate = format(new Date(transaction.transaction_date), 'dd.MM.yyyy');
  const timeStr = new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const no = transaction.receipt_number || '';
  const fullName = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ');
  const mun = c.municipality || c.city || '';
  const isBank = transaction.payment_method === 'bank';
  const issuedCity = (c.id_card_issued_by || '').replace(/^МВР\s*/i, '').replace(/\s*обл\..*$/i, '').trim() || 'София';

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ===== HEADER ===== */}
        <View style={s.hdrRow}>
          <Text style={s.hdrBold}>{COMPANY}</Text>
          <Text>{COMPANY_ADDR}</Text>
          <Text>ИН по ЗДДС: {COMPANY_VAT} ИН: {COMPANY_EIK}</Text>
        </View>

        {/* ===== ПИС TITLE ===== */}
        <View style={[s.row3, { marginBottom: 1 }]}>
          <View style={s.pisLeft}><Text>{WAREHOUSE}</Text></View>
          <View style={s.pisMid}><Text style={s.pisTitle}>Покупко - изплащателна сметка</Text></View>
          <View style={s.pisRight}>
            <Text>No и Дата на разрешението:</Text>
            <Text>{PERMISSION}</Text>
            {isBank && <Text style={{ fontWeight: 'bold' }}>Плащане по банков път</Text>}
          </View>
        </View>

        {/* No / Date row */}
        <View style={[s.noRow, { marginBottom: 2 }]}>
          <Text style={[s.noCell, { width: '33%' }]}>No:{'   '}{no}</Text>
          <Text style={[s.noCell, { width: '34%', textAlign: 'center' }]}>Дата:{'   '}{txDate} г.</Text>
          <Text style={{ width: '33%' }} />
        </View>

        {/* Client line 1 */}
        <Text style={s.ln}>Подписаният{'   '}{fullName}{'   '}ЕГН{'   '}{c.egn}{'   '}л. к .{'   '}{c.id_card_number}{'   '}издадена на{'   '}{fmtD(c.id_card_issued_date)}</Text>
        <Text style={s.ln}>от МВР {issuedCity} обл.{'   '}град (с) {c.city}{'   '}община {mun}{'   '}адрес {c.address}</Text>
        <Text style={[s.ln, { marginBottom: 1 }]}>удостоверявам, че предадох:</Text>

        {/* ===== TABLE ===== */}
        <View style={s.tbl}>
          <View style={s.tr}>
            <Text style={[s.th, s.c0]}>No</Text>
            <Text style={[s.th, s.c1]}>Наименование на предадените{'
'}отпадъци</Text>
            <Text style={[s.th, s.c2]}>Мярка</Text>
            <Text style={[s.th, s.c3]}>Количество</Text>
            <Text style={[s.th, s.c4]}>Един. цена</Text>
            <Text style={[s.th, s.c5, { borderRightWidth: 0 }]}>Обща{'
'}стойност</Text>
          </View>
          {items.map((it: any, i: number) => {
            const nom = it.nomenclatures || {};
            const nameStr = [nom.name, nom.waste_code].filter(Boolean).join(' ');
            return (
              <View key={i} style={i < items.length - 1 ? s.tr : s.trL}>
                <Text style={[s.td, s.c0]}>{i + 1}</Text>
                <Text style={[s.td, s.c1]}>{nameStr}</Text>
                <Text style={[s.td, s.c2, { textAlign: 'center' }]}>{nom.unit || 'kg'}</Text>
                <Text style={[s.td, s.c3, { textAlign: 'right' }]}>{fmtN(Number(it.quantity), 2)}</Text>
                <Text style={[s.td, s.c4, { textAlign: 'right' }]}>{fmtN(Number(it.unit_price), 4)}</Text>
                <Text style={[s.tdX, s.c5, { textAlign: 'right' }]}>{fmtN(Number(it.total_price), 2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Словом / Сума */}
        <View style={s.slovomRow}>
          <Text>Словом общо:{'  '}{amountWords(total)}</Text>
          <Text>Сума за плащане:{'      '}{fmtN(total)}</Text>
        </View>

        {/* Signatures ПИС */}
        <View style={s.sigRow}>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Купувач:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{OPERATOR}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Продавач:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigNote}>(подпис на лицето, предало отпадъка)</Text>
            <Text style={s.sigName}>{fullName}</Text>
          </View>
        </View>

        {/* ===== DIVIDER ===== */}
        <View style={s.divider} />

        {/* ===== ДЕКЛАРАЦИЯ ===== */}
        <View style={s.declTR}>
          <Text style={s.declTitle}>Декларация за произход на отпадъци от черни и цветни метали</Text>
          <Text style={s.declRef}>Образец № 1 към чл. 39, ал. 4 от ЗУО</Text>
        </View>

        <Text style={s.ln}>Долуподписаният/ата{'   '}{fullName}{'   '}ЕГН {c.egn}{'   '}град (с) {c.city}</Text>
        <Text style={s.ln}>община {mun}{'   '}адрес {c.address}{'   '}л. к . {c.id_card_number}{'   '}издадена на {fmtD(c.id_card_issued_date)} от МВР {issuedCity} обл.</Text>
        <Text style={s.ln}>декларирам, че продавам собствени отпадъци от черни и цветни метали с битов характер, представляващи:</Text>

        {items.map((it: any, i: number) => {
          const nom = it.nomenclatures || {};
          return (
            <Text key={i} style={[s.ln, { marginLeft: 10 }]}>
              {i + 1} {nom.name || ''} {nom.waste_code || ''}{'   '}{fmtN(Number(it.quantity), 2)}{'   '}{qtyWords(Number(it.quantity))}
            </Text>
          );
        })}

        <Text style={[s.ln, { marginTop: 2 }]}>Известна ми е наказателната отговорност, по чл. 313 от Наказателния кодекс за деклариране на неверни данни.</Text>
        <Text style={s.ln}>Уведомен съм, че обектът е под видеонаблюдение.</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3, marginBottom: 2 }}>
          <Text>Декларатор:</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text>Дата:{'   '}{txDate}{'   '}{timeStr}{'   '}гр./с.:{'   '}{c.city || 'София'}</Text>
          <View style={{ width: '36%' }}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{fullName}</Text>
          </View>
        </View>

        {/* ===== DIVIDER ===== */}
        <View style={s.divider} />

        {/* ===== ДОГОВОР ===== */}
        <Text style={s.ctTitle}>Договор №{'   '}{no}{'   '}/{'   '}{txDate} г.</Text>

        <Text style={s.ctText}>Днес,{'   '}{txDate} г. в{'   '}{c.city || 'София'}{'   '}, се сключи този договор за продажба между:</Text>
        <Text style={s.ctText}>1. {COMPANY}{'   '}със седалище и адрес на управление {COMPANY_ADDR}</Text>
        <Text style={s.ctText}>ИН: {COMPANY_EIK} представлявано от{'   '}{OPERATOR}{'   '}, наричан по-долу Купувач и</Text>
        <Text style={s.ctText}>2. {fullName}{'   '}с адрес{'   '}{c.address}</Text>
        <Text style={s.ctText}>ЕГН: {c.egn} л. к .{'   '}{c.id_card_number} издадена от МВР {issuedCity} обл. на {fmtD(c.id_card_issued_date)} наричан по-долу Продавач</Text>
        <Text style={s.ctText}>Страните се споразумяха за следното:</Text>
        <Text style={s.ctText}>1. Предмет на договора.</Text>
        <Text style={s.ctText}>Продавача прехвърля на Купувача правото на собственост и му предава стоката, описана по-горе в ПИС № {no} / {txDate} , която е неразделна част от този договор, срещу задължението на Купувача да му заплати уговорената цена.</Text>
        {isBank && (
          <Text style={[s.ctText, { fontWeight: 'bold' }]}>Плащането ще се извърши по сметка: {transaction.bank_account}{'   '}{transaction.bank_name}{'   '}{transaction.bank_bic}</Text>
        )}
        <Text style={s.ctText}>2. Общи положения. Купувачът има право на обезщетение в размер на платената от него цена по този договор, ако бъде лишен от държането или бъде съдебно отстранен от закупените стоки поради това, че трети лица имат претенции за собствеността върху тях или неистинност на гореподписаната декларация.</Text>
        <Text style={s.ctText}>Този договор се състави и подписа в два еднакви екземпляра, по един за всяка от страните.</Text>

        {/* Signatures Договор */}
        <View style={s.sigRow}>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Купувач:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{OPERATOR}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Продавач:</Text>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{fullName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text>© Деметра Софт</Text>
          <Text>стр. 1 от 1</Text>
        </View>

      </Page>
    </Document>
  );
}
