import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { numberToBulgarianWords } from '@/lib/utils';
import { format } from 'date-fns';

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: 'Roboto' },
  section: { marginBottom: 8, borderWidth: 1, borderColor: '#000', padding: 6 },
  title: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 9, fontWeight: 'bold', marginBottom: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  table: { borderWidth: 1, borderColor: '#000', marginTop: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000' },
  th: { padding: 3, borderRightWidth: 1, borderColor: '#000', fontWeight: 'bold', fontSize: 8 },
  td: { padding: 3, borderRightWidth: 1, borderColor: '#000', fontSize: 8 },
  c1: { width: '6%' }, c2: { width: '40%' }, c3: { width: '10%' }, c4: { width: '14%' }, c5: { width: '14%' }, c6: { width: '16%' },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sigBox: { width: '45%', borderTopWidth: 1, borderColor: '#000', paddingTop: 2, textAlign: 'center', fontSize: 8 },
  small: { fontSize: 7, lineHeight: 1.3 },
});

export default function TransactionPDF({ transaction }: { transaction: any }) {
  const c = transaction.customers || {};
  const items = transaction.transaction_items || [];
  const total = Number(transaction.total_amount || 0);
  const date = format(new Date(transaction.transaction_date), 'dd.MM.yyyy');
  const totalWords = numberToBulgarianWords(total);
  const fullName = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ПИС */}
        <View style={styles.section}>
          <Text style={styles.title}>ПОКУПКО-ИЗПЛАЩАТЕЛНА СМЕТКА (ПИС) № {transaction.receipt_number}</Text>
          <View style={styles.row}>
            <Text>Прогрестрейд ЕООД, гр. София, ул. проф. Иван Георгов №1</Text>
            <Text>Дата: {date}</Text>
          </View>
          <View style={styles.row}>
            <Text>ЕИК: 130975863 / ДДС №: BG130975863</Text>
            <Text>Оператор: {transaction.operator_name || ''}</Text>
          </View>
          <Text style={{ marginTop: 4 }}>Доставчик: {fullName}, ЕГН: {c.egn}</Text>
          <Text>ЛК №: {c.id_card_number}, изд. от {c.id_card_issued_by} на {c.id_card_issued_date}, валидна до {c.id_card_expiry}</Text>
          <Text>Адрес: {c.address}, гр. {c.city}, общ. {c.municipality}</Text>

          <View style={styles.table}>
            <View style={styles.tr}>
              <Text style={[styles.th, styles.c1]}>№</Text>
              <Text style={[styles.th, styles.c2]}>Наименование</Text>
              <Text style={[styles.th, styles.c3]}>Мярка</Text>
              <Text style={[styles.th, styles.c4]}>Количество</Text>
              <Text style={[styles.th, styles.c5]}>Ед. цена</Text>
              <Text style={[styles.th, styles.c6, { borderRightWidth: 0 }]}>Обща стойност</Text>
            </View>
            {items.map((it: any, i: number) => (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, styles.c1]}>{i + 1}</Text>
                <Text style={[styles.td, styles.c2]}>{it.nomenclatures?.name} ({it.nomenclatures?.waste_code})</Text>
                <Text style={[styles.td, styles.c3]}>{it.nomenclatures?.unit || 'кг'}</Text>
                <Text style={[styles.td, styles.c4]}>{Number(it.quantity).toFixed(3)}</Text>
                <Text style={[styles.td, styles.c5]}>{Number(it.unit_price).toFixed(4)}</Text>
                <Text style={[styles.td, styles.c6, { borderRightWidth: 0 }]}>{Number(it.total_price).toFixed(2)}</Text>
              </View>
            ))}
            <View style={styles.tr}>
              <Text style={[styles.td, { width: '70%', textAlign: 'right', fontWeight: 'bold' }]}>ОБЩО:</Text>
              <Text style={[styles.td, { width: '30%', borderRightWidth: 0, fontWeight: 'bold' }]}>{total.toFixed(2)} лв.</Text>
            </View>
          </View>
          <Text style={{ marginTop: 3, fontStyle: 'italic' }}>Словом: {totalWords}</Text>
          <Text>Начин на плащане: {transaction.payment_method === 'cash' ? 'В брой' : `По банков път - ${transaction.bank_name} IBAN: ${transaction.bank_account} BIC: ${transaction.bank_bic}`}</Text>
          <View style={styles.sigRow}>
            <Text style={styles.sigBox}>Купувач: ________________</Text>
            <Text style={styles.sigBox}>Продавач: ________________</Text>
          </View>
        </View>

        {/* Декларация */}
        <View style={styles.section}>
          <Text style={styles.title}>ДЕКЛАРАЦИЯ ЗА ПРОИЗХОД НА ОТПАДЪЦИ</Text>
          <Text style={styles.small}>
            Долуподписаният(ата) {fullName}, ЕГН {c.egn}, притежател на ЛК № {c.id_card_number}, издадена от {c.id_card_issued_by} на {c.id_card_issued_date}, с адрес {c.address}, гр. {c.city}, общ. {c.municipality},{' '}
            декларирам, че описаните в ПИС № {transaction.receipt_number} от {date} отпадъци са моя собственост, произхождат от законен източник, не са придобити чрез престъпление, не са общинска или държавна собственост, не са част от електрически, електронен или друг уред,{' '}
            който подлежи на връщане по реда на ЗУО. Известно ми е, че за деклариране на неверни данни нося наказателна отговорност по чл. 313 от НК.
          </Text>
          <View style={styles.sigRow}>
            <Text style={styles.sigBox}>Дата: {date}</Text>
            <Text style={styles.sigBox}>Декларатор: ________________</Text>
          </View>
        </View>

        {/* Договор */}
        <View style={styles.section}>
          <Text style={styles.title}>ДОГОВОР № {transaction.contract_number || transaction.receipt_number}</Text>
          <Text style={styles.small}>
            Днес, {date} г., в гр. София, между "Прогрестрейд" ЕООД, ЕИК 130975863, със седалище и адрес на управление: гр. София, ул. проф. Иван Георгов №1, наричано по-долу КУПУВАЧ,{' '}
            от една страна, и {fullName}, ЕГН {c.egn}, ЛК № {c.id_card_number}, адрес {c.address}, гр. {c.city}, наричан по-долу ПРОДАВАЧ, от друга страна, се сключи настоящият договор.
          </Text>
          <Text style={styles.small}>
            Чл. 1. ПРОДАВАЧЪТ продава, а КУПУВАЧЪТ купува отпадъците, описани в ПИС № {transaction.receipt_number} от {date}, на обща стойност {total.toFixed(2)} лв. ({totalWords}).{'\n'}
            Чл. 2. Плащането се извършва {transaction.payment_method === 'cash' ? 'в брой при подписване на договора' : `по банков път на IBAN ${transaction.bank_account}, банка ${transaction.bank_name}, BIC ${transaction.bank_bic}`}.{'\n'}
            Чл. 3. ПРОДАВАЧЪТ декларира законен произход на отпадъците и носи отговорност за верността на данните.{'\n'}
            Чл. 4. Договорът се състави в два еднообразни екземпляра - по един за всяка страна.
          </Text>
          <View style={styles.sigRow}>
            <Text style={styles.sigBox}>ПРОДАВАЧ: ________________</Text>
            <Text style={styles.sigBox}>КУПУВАЧ: ________________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
