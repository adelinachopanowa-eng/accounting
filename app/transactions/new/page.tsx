'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IDCardScanner from '@/components/customers/IDCardScanner';
import type { Customer, Nomenclature } from '@/types';

type Item = { nomenclature_id: string; name: string; quantity: number; unit_price: number; total_price: number };

export default function NewTransactionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Partial<Customer>>({});
  const [nomenclatures, setNomenclatures] = useState<Nomenclature[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [payment, setPayment] = useState<'cash' | 'bank'>('cash');
  const [bank, setBank] = useState({ bank_account: '', bank_name: '', bank_bic: '' });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchEgn, setSearchEgn] = useState('');

  useEffect(() => {
    fetch('/api/nomenclatures').then(r => r.json()).then(d => setNomenclatures(d.data || []));
  }, []);

  const searchCustomer = useCallback(async (egn: string) => {
    if (egn.length !== 10) return;
    const res = await fetch(`/api/customers?egn=${egn}`);
    const d = await res.json();
    if (d.data) setCustomer(d.data);
  }, []);

  useEffect(() => {
    if (searchEgn.length === 10) {
      const t = setTimeout(() => searchCustomer(searchEgn), 300);
      return () => clearTimeout(t);
    }
  }, [searchEgn, searchCustomer]);

  const onOCR = (data: Partial<Customer>) => {
    setCustomer(data);
    if (data.egn) setSearchEgn(data.egn);
  };

  const addItem = () => {
    if (!nomenclatures.length) return;
    const n = nomenclatures[0];
    setItems([...items, { nomenclature_id: n.id, name: n.name, quantity: 0, unit_price: Number(n.current_price), total_price: 0 }]);
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      merged.total_price = Number((merged.quantity * merged.unit_price).toFixed(2));
      return merged;
    }));
  };

  const changeNomenclature = (idx: number, nomId: string) => {
    const n = nomenclatures.find(n => n.id === nomId);
    if (!n) return;
    updateItem(idx, { nomenclature_id: nomId, name: n.name, unit_price: Number(n.current_price) });
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const total = items.reduce((a, b) => a + b.total_price, 0);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items, payment_method: payment, ...bank, notes }),
      });
      const d = await res.json();
      if (d.id) router.push(`/api/pdf/${d.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-bold">Нова сделка</h1>

      {/* Step indicators */}
      <div className="flex gap-1 md:gap-2 text-xs md:text-sm overflow-x-auto pb-1">
        {['Клиент', 'Артикули', 'Плащане', 'Преглед'].map((label, i) => (
          <div key={i} className={`px-2 md:px-4 py-1.5 md:py-2 rounded-full whitespace-nowrap ${
            step === i + 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="text-base md:text-lg font-semibold">Идентификация на клиента</h2>
          <IDCardScanner onExtracted={onOCR} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="label">ЕГН</label><input className="input" value={customer.egn || ''} onChange={e => { setCustomer({ ...customer, egn: e.target.value }); setSearchEgn(e.target.value); }} /></div>
            <div><label className="label">№ на документа</label><input className="input" value={customer.id_card_number || ''} onChange={e => setCustomer({ ...customer, id_card_number: e.target.value })} /></div>
            <div><label className="label">Издаден от</label><input className="input" value={customer.id_card_issued_by || ''} onChange={e => setCustomer({ ...customer, id_card_issued_by: e.target.value })} /></div>
            <div><label className="label">Име</label><input className="input" value={customer.first_name || ''} onChange={e => setCustomer({ ...customer, first_name: e.target.value })} /></div>
            <div><label className="label">Презиме</label><input className="input" value={customer.middle_name || ''} onChange={e => setCustomer({ ...customer, middle_name: e.target.value })} /></div>
            <div><label className="label">Фамилия</label><input className="input" value={customer.last_name || ''} onChange={e => setCustomer({ ...customer, last_name: e.target.value })} /></div>
            <div><label className="label">Дата на издаване</label><input type="date" className="input" value={customer.id_card_issued_date || ''} onChange={e => setCustomer({ ...customer, id_card_issued_date: e.target.value })} /></div>
            <div><label className="label">Валидност</label><input type="date" className="input" value={customer.id_card_expiry || ''} onChange={e => setCustomer({ ...customer, id_card_expiry: e.target.value })} /></div>
            <div><label className="label">Град</label><input className="input" value={customer.city || ''} onChange={e => setCustomer({ ...customer, city: e.target.value })} /></div>
            <div className="sm:col-span-2 md:col-span-3"><label className="label">Адрес</label><input className="input" value={customer.address || ''} onChange={e => setCustomer({ ...customer, address: e.target.value })} /></div>
          </div>
          <div className="flex justify-end"><button className="btn btn-primary" onClick={() => setStep(2)} disabled={!customer.egn || !customer.first_name}>Напред →</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold">Артикули</h2>
            <button className="btn btn-secondary text-sm" onClick={addItem}>+ Добави</button>
          </div>

          {/* Mobile: card per item */}
          <div className="md:hidden space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 space-y-2">
                <select className="input text-sm" value={it.nomenclature_id} onChange={e => changeNomenclature(idx, e.target.value)}>
                  {nomenclatures.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label text-xs">Количество (кг)</label><input type="number" step="0.001" className="input" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} /></div>
                  <div><label className="label text-xs">Цена (лв/кг)</label><input type="number" step="0.0001" className="input" value={it.unit_price} onChange={e => updateItem(idx, { unit_price: Number(e.target.value) })} /></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-brand-600">{it.total_price.toFixed(2)} лв.</span>
                  <button className="text-red-500 text-sm" onClick={() => removeItem(idx)}>Изтрий</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-slate-400 text-sm text-center py-4">Няма добавени артикули</p>}
            <div className="text-right font-bold pt-2">Общо: {total.toFixed(2)} лв.</div>
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr><th className="py-2">Наименование</th><th>Количество (кг)</th><th>Цена</th><th>Сума</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2">
                      <select className="input" value={it.nomenclature_id} onChange={e => changeNomenclature(idx, e.target.value)}>
                        {nomenclatures.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                      </select>
                    </td>
                    <td><input type="number" step="0.001" className="input" value={it.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })} /></td>
                    <td><input type="number" step="0.0001" className="input" value={it.unit_price} onChange={e => updateItem(idx, { unit_price: Number(e.target.value) })} /></td>
                    <td className="font-semibold">{it.total_price.toFixed(2)} лв.</td>
                    <td><button className="text-red-600" onClick={() => removeItem(idx)}>Изтрий</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="text-right font-bold pt-4">Общо:</td><td className="font-bold pt-4">{total.toFixed(2)} лв.</td><td></td></tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Назад</button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={items.length === 0 || total <= 0}>Напред →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4">
          <h2 className="text-base md:text-lg font-semibold">Начин на плащане</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> В брой</label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={payment === 'bank'} onChange={() => setPayment('bank')} /> По банков път</label>
          </div>
          {payment === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="label">IBAN</label><input className="input" value={bank.bank_account} onChange={e => setBank({ ...bank, bank_account: e.target.value })} /></div>
              <div><label className="label">Банка</label><input className="input" value={bank.bank_name} onChange={e => setBank({ ...bank, bank_name: e.target.value })} /></div>
              <div><label className="label">BIC</label><input className="input" value={bank.bank_bic} onChange={e => setBank({ ...bank, bank_bic: e.target.value })} /></div>
            </div>
          )}
          <div><label className="label">Бележки</label><textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          <div className="flex justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← Назад</button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>Преглед →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card space-y-4">
          <h2 className="text-base md:text-lg font-semibold">Преглед</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><b>Клиент:</b> {customer.first_name} {customer.middle_name} {customer.last_name}</div>
            <div><b>ЕГН:</b> {customer.egn}</div>
            <div><b>Документ:</b> {customer.id_card_number}</div>
            <div><b>Адрес:</b> {customer.address}, {customer.city}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t">
              <thead><tr className="text-left text-slate-500"><th className="py-2">Артикул</th><th>Кол.</th><th>Цена</th><th>Сума</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}><td className="py-1 pr-2">{it.name}</td><td>{it.quantity}</td><td>{it.unit_price.toFixed(4)}</td><td>{it.total_price.toFixed(2)}</td></tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="text-right font-bold pt-2">Общо:</td><td className="font-bold pt-2">{total.toFixed(2)} лв.</td></tr></tfoot>
            </table>
          </div>
          <div className="flex justify-between">
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← Назад</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Записване...' : 'Запиши и PDF'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
