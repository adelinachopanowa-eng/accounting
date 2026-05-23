export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div className="text-sm font-semibold text-slate-800 md:hidden">Прогрестрейд ЕООД</div>
      <div className="hidden md:block text-sm text-slate-600">Пункт за изкупуване на вторични суровини</div>
      <div className="hidden md:block text-sm text-slate-500">София, ул. проф. Иван Георгов №1 · ИН: 130975863</div>
    </header>
  );
}
