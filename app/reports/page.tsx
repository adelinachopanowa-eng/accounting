'use client';
import { useState } from 'react';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState('nomenclature');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/reports?from=${from}&to=${to}&groupBy=${groupBy}`);
      const d = await r.json();
      setRows(d.data || []);
    } finally { setLoading(false); }
  };

  const exportCSV = () => {
    const headers = ['Категория', 'Количество (кг)', 'Сума (EUR)'];
    const lines = [headers.join(','), ...rows.map(r => [r.label, r.quantity, r.amount].join(','))];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${from}-${to}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Справки</h1>
      <div className="card flex flex-wrap items-end gap-4">
        <div><label className="label">От</label><input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><label className="label">До</label><input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} /></div>
        <div>
          <label className="label">Групиране</label>
          <select className="input" value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            <option value="nomenclature">По номенклатура</option>
            <option value="customer">По клиент</option>
            <option value="day">По ден</option>
            <option value="week">По седмица</option>
            <option value="month">По месец</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading}>{loading ? 'Зареждане...' : 'Генерирай'}</button>
        <button className="btn btn-secondary" onClick={exportCSV} disabled={!rows.length}>Експорт CSV</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b"><tr><th className="py-2">Категория</th><th className="text-right">Количество (кг)</th><th className="text-right">Сума (EUR)</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b"><td className="py-2">{r.label}</td><td className="text-right">{Number(r.quantity).toFixed(3)}</td><td className="text-right">{Number(r.amount).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
