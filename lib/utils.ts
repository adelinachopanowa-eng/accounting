import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function numberToBulgarianWords(amount: number): string {
  const lv = Math.floor(amount);
  const st = Math.round((amount - lv) * 100);
  let lvText = '';
  if (lv === 0) lvText = 'нула';
  else if (lv < 1000) lvText = underThousand(lv);
  else {
    const th = Math.floor(lv / 1000);
    const rest = lv % 1000;
    if (th === 1) lvText = 'хиляда';
    else if (th === 2) lvText = 'две хиляди';
    else lvText = underThousand(th, true) + ' хиляди';
    if (rest) lvText += ' ' + underThousand(rest);
  }
  const cap = lvText.charAt(0).toUpperCase() + lvText.slice(1);
  return `${cap} лв. и ${String(st).padStart(2, '0')} ст.`;
}
