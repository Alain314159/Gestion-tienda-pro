import * as BigModule from 'big.js';
const Big = (BigModule as any).default || BigModule;

Big.DP = 20;
Big.RM = 1;

export function toBig(val: number | string | Big | null | undefined): Big {
  if (val instanceof Big) return val;
  if (val === null || val === undefined || val === '') return new Big('0');
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return new Big('0');
    return new Big(String(val));
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(',', '.').trim();
    if (cleaned === '' || isNaN(Number(cleaned))) return new Big('0');
    return new Big(cleaned);
  }
  return new Big('0');
}

export function add(...values: (number | string | Big)[]): Big {
  return values.reduce((acc, v) => acc.plus(toBig(v)), new Big('0'));
}

export function sub(a: number | string | Big, b: number | string | Big): Big {
  return toBig(a).minus(toBig(b));
}

export function mul(a: number | string | Big, b: number | string | Big): Big {
  return toBig(a).times(toBig(b));
}

export function div(a: number | string | Big, b: number | string | Big): Big {
  const divisor = toBig(b);
  if (divisor.eq('0')) return new Big('0');
  return toBig(a).div(divisor);
}

export function round(value: number | string | Big, decimals = 2): Big {
  return toBig(value).round(decimals, 1);
}

export function m2(value: number | string | Big): Big {
  return round(value, 2);
}

export function m3(value: number | string | Big): Big {
  return round(value, 3);
}

export function toNumber(value: number | string | Big): number {
  return toBig(value).toNumber();
}

export function toFixed(value: number | string | Big, decimals = 2): string {
  return toBig(value).toFixed(decimals);
}

export function toString(value: number | string | Big): string {
  return toBig(value).toString();
}

export function toCents(value: number | string | Big): number {
  return toBig(value).times('100').round(0, 1).toNumber();
}

export function fromCents(cents: number | string | Big): Big {
  return toBig(cents).div('100');
}

export function eq(a: number | string | Big, b: number | string | Big): boolean {
  return toBig(a).eq(toBig(b));
}
export function gt(a: number | string | Big, b: number | string | Big): boolean {
  return toBig(a).gt(toBig(b));
}
export function lt(a: number | string | Big, b: number | string | Big): boolean {
  return toBig(a).lt(toBig(b));
}
export function gte(a: number | string | Big, b: number | string | Big): boolean {
  return toBig(a).gte(toBig(b));
}
export function lte(a: number | string | Big, b: number | string | Big): boolean {
  return toBig(a).lte(toBig(b));
}

export function abs(value: number | string | Big): Big {
  return toBig(value).abs();
}

export function max(...values: (number | string | Big)[]): Big {
  return values.reduce((acc, v) => (toBig(v).gt(acc) ? toBig(v) : acc), toBig(values[0]));
}
export function min(...values: (number | string | Big)[]): Big {
  return values.reduce((acc, v) => (toBig(v).lt(acc) ? toBig(v) : acc), toBig(values[0]));
}

export function sum(
  array: any[] | null | undefined,
  getter: string | ((item: any) => any) | null = null
): Big {
  if (!array || !array.length) return new Big('0');
  let getFn: (item: any) => any;
  if (typeof getter === 'string') {
    getFn = (item: any) => item[getter];
  } else if (!getter) {
    getFn = (x: any) => x;
  } else {
    getFn = getter;
  }
  return array.reduce((acc: Big, item: any) => {
    const val = getFn(item);
    return val === undefined || val === null ? acc : acc.plus(toBig(val));
  }, new Big('0'));
}

export function sumWhere(
  array: any[] | null | undefined,
  predicate: (item: any) => boolean,
  getter: string | ((item: any) => any)
): Big {
  if (!array || !array.length) return new Big('0');
  let getFn: (item: any) => any;
  if (typeof getter === 'string') {
    getFn = (item: any) => item[getter];
  } else {
    getFn = getter;
  }
  return array.reduce((acc: Big, item: any) => {
    if (!predicate(item)) return acc;
    const val = getFn(item);
    return val === undefined || val === null ? acc : acc.plus(toBig(val));
  }, new Big('0'));
}

export function pct(part: number | string | Big, total: number | string | Big): Big {
  const t = toBig(total);
  if (t.eq('0')) return new Big('0');
  return toBig(part).div(t).times('100');
}

export function margin(ganancia: number | string | Big, ventas: number | string | Big): Big {
  const v = toBig(ventas);
  if (v.eq('0')) return new Big('0');
  return toBig(ganancia).div(v).times('100');
}

export function allocate(amount: number | string | Big, parts: number, decimals = 2): Big[] {
  const total = toBig(amount);
  const n = Math.max(1, parts);
  const base = total.div(String(n)).round(decimals, 1);
  const result: Big[] = Array(n).fill(null).map(() => base);
  const baseTotal = base.times(String(n));
  let remainder = total.minus(baseTotal);
  let i = 0;
  while (remainder.gt('0')) {
    const increment = new Big('0.01');
    result[i % n] = result[i % n].plus(increment);
    remainder = remainder.minus(increment);
    i++;
  }
  return result;
}

export function inspect(value: number | string | Big): {
  value: string; fixed2: string; number: number; cents: number;
} {
  const b = toBig(value);
  return { value: b.toString(), fixed2: b.toFixed(2), number: b.toNumber(), cents: toCents(b) };
}

export { Big };
