'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#a855f7', '#84cc16', '#f97316'];

export default function Charts({ daily, breakdown }: { daily: { date: string; amount: number }[]; breakdown: { name: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-semibold mb-3">Покупки последни 30 дни</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="amount" fill="#16a34a" /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold mb-3">Разбивка по номенклатура (месец)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={breakdown} dataKey="value" nameKey="name" outerRadius={80} label>
              {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Legend /><Tooltip /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
