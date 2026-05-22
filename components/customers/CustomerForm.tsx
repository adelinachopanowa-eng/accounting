'use client';
import type { Customer } from '@/types';

export default function CustomerForm({ value, onChange }: { value: Partial<Customer>; onChange: (v: Partial<Customer>) => void }) {
  const f = (k: keyof Customer) => ({ value: (value[k] as string) || '', onChange: (e: any) => onChange({ ...value, [k]: e.target.value }) });
  return (
    <div className="grid grid-cols-3 gap-4">
      <div><label className="label">ЕГН</label><input className="input" {...f('egn')} /></div>
      <div><label className="label">Име</label><input className="input" {...f('first_name')} /></div>
      <div><label className="label">Фамилия</label><input className="input" {...f('last_name')} /></div>
      <div><label className="label">Презиме</label><input className="input" {...f('middle_name')} /></div>
      <div><label className="label">№ документ</label><input className="input" {...f('id_card_number')} /></div>
      <div><label className="label">Издаден от</label><input className="input" {...f('id_card_issued_by')} /></div>
      <div className="col-span-3"><label className="label">Адрес</label><input className="input" {...f('address')} /></div>
      <div><label className="label">Град</label><input className="input" {...f('city')} /></div>
      <div><label className="label">Община</label><input className="input" {...f('municipality')} /></div>
    </div>
  );
}
