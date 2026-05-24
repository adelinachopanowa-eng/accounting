type Props = { stats: { todayAmount: number; todayWeight: number; monthAmount: number; monthWeight: number } };

export default function StatsCards({ stats }: Props) {
  const cards = [
    { label: 'Днес - сума', value: `${stats.todayAmount.toFixed(2)} EUR` },
    { label: 'Днес - тегло', value: `${stats.todayWeight.toFixed(2)} кг` },
    { label: 'Месец - сума', value: `${stats.monthAmount.toFixed(2)} EUR` },
    { label: 'Месец - тегло', value: `${stats.monthWeight.toFixed(2)} кг` },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className="card">
          <div className="text-xs text-slate-500">{c.label}</div>
          <div className="text-2xl font-bold mt-2">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
