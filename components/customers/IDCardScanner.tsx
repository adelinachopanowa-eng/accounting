'use client';
import { useState, useRef } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import type { Customer } from '@/types';

export default function IDCardScanner({ onExtracted }: { onExtracted: (data: Partial<Customer>) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const b64: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const r = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: b64 }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onExtracted(d.data);
    } catch (e: any) {
      setError(e.message || 'Грешка при разпознаване');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <div className="flex justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
          <span className="ml-2">{loading ? 'Разпознаване...' : 'Сканирай ЛК'}</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={loading}>
          <Upload size={18} /><span className="ml-2">Качи снимка</span>
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-3">Заснемете лична карта - данните ще се попълнят автоматично</p>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
