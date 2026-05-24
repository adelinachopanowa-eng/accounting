import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Фиксиран курс при влизане на България в еврозоната (01.01.2026)
export const EUR_TO_BGN_RATE = 1.95583;

const ones = ['', 'един', 'два', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет'];
const onesF = ['', 'една', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет'];
const teens = ['десет', 'единадесет', 'дванадесет', 'тринадесет', 'четиринадесет', 'петнадесет', 'шестнадесет', 'седемнадесет', 'осемнадесет', 'деветнадесет'];
const tens = ['', '', 'двадесет', 'тридесет', 'четиридесет', 'петдесет', 'шестдесет', 'седемдесет', 'осемдесет', 'деветдесет'];
const hundreds = ['', 'сто', 'двеста', 'триста', 'четиристотин', 'петстотин', 'шестстотин', 'седемстотин', 'осемстотин', 'деветстотин'];

function underThousand(n: number, fem = false): string {
  if (n === 0) return '';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(hundreds[h]);
  if (rest === 0) return parts.join(' ');
  if (rest < 10) {
    if (parts.length) parts.push('и');
    parts.push((fem ? onesF : ones)[rest]);
  } else if (rest < 20) {
    if (parts.length) parts.push('и');
    parts.push(teens[rest - 10]);
  } else {
    const t = Math.floor(rest / 10);
    const o = rest % 10;
    if (parts.length) parts.push('и');
    parts.push(tens[t]);
    if (o) parts.push('и', (fem ? onesF : ones)[o]);
  }
  return parts.join(' ');
}

export function intToBulgarianWords(n: number, fem = false): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'нула';
  let text: string;
  if (n < 1000) text = underThousand(n, fem);
  else {
    const th = Math.floor(n / 1000);
    const rest = n % 1000;
    if (th === 1) text = 'хиляда';
    else if (th === 2) text = 'две хиляди';
    else text = underThousand(th, true) + ' хиляди';
    if (rest) text += ' ' + underThousand(rest, fem);
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Сума в евро и евроцента (България е в еврозоната от 2026)
export function numberToBulgarianWords(amount: number): string {
  const eu = Math.floor(amount);
  const ec = Math.round((amount - eu) * 100);
  const euText = intToBulgarianWords(eu);
  return `${euText} евро и ${String(ec).padStart(2, '0')} ец.`;
}

export function eurToBgn(amount: number): number {
  return amount * EUR_TO_BGN_RATE;
}
