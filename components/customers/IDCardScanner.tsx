'use client';
import { useState, useRef } from 'react';
import { Camera, ImageIcon, Loader2, X } from 'lucide-react';
import type { Customer } from '@/types';

export default function IDCardScanner({ onExtracted }: { onExtracted: (data: Partial<Customer>) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setLoading(true);
    setError('');
    try {
      const images: string[] = await Promise.all(
        Array.from(files).map(
          file => new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(file);
          })
        )
      );
      setPreviews(prev => [...prev, ...images]);
      const resp = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error);
      onExtracted(d.data);
    } catch (e: any) {
      setError(e.message || 'Грешка при разпознаване');
    } finally {
      setLoading(false);
    }
  };

  const removePreview = (idx: number) => setPreviews(p => p.filter((_, i) => i !== idx));

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 space-y-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.length && handleFiles(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files?.length && handleFiles(e.target.files)} />

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => { cameraRef.current!.value=''; cameraRef.current?.click(); }} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
          <span className="ml-2">{loading ? 'Разпознаване...' : 'Камера'}</span>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => { galleryRef.current!.value=''; galleryRef.current?.click(); }} disabled={loading}>
          <ImageIcon size={18} /><span className="ml-2">От галерия</span>
        </button>
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="h-20 w-auto rounded border object-cover" />
              <button type="button" onClick={() => removePreview(i)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Можете да изберете няколко снимки (предна и задна страна на ЛК)
      </p>
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
    </div>
  );
}
