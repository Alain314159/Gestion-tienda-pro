import * as BigModule from 'big.js';
const Big = BigModule.default || BigModule;

/**
 * Motor de precision decimal para calculos financieros.
 * Reemplaza el uso de numeros nativos (float) en toda la app.
 * Basado en big.js - libreria estandar de la industria fintech.
 * 
 * REGLA DE ORO: Nunca pases un numero JavaScript a new Big().
 * Siempre convierte a string primero: new Big(String(valor))
 * o usa las funciones de utilidad de este archivo.
 */

// Configuracion global de big.js
Big.DP = 20;  // Decimal places para division (default 20)
Big.RM = 1;   // Rounding mode: 1 = half-up (redondeo comercial estandar)

/**
 * Convierte cualquier valor a Big de forma segura.
 * Acepta: number, string, Big, null, undefined.
 * Nunca pasa numeros JS directamente - siempre via String().
 */
export function toBig(val) {
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

/**
 * Suma segura de N valores.
 * Money.add(10.1, 0.2, 5) -> 15.3 exacto
 */
export function add(...values) {
  return values.reduce((acc, v) => acc.plus(toBig(v)), new Big('0'));
}

/**
 * Resta segura.
 * Money.sub(10, 0.3) -> 9.7 exacto
 */
export function sub(a, b) {
  return toBig(a).minus(toBig(b));
}

/**
 * Multiplicacion segura.
 * Money.mul(0.1, 0.2) -> 0.02 exacto
 */
export function mul(a, b) {
  return toBig(a).times(toBig(b));
}

/**
 * Division segura.
 * Money.div(10, 3) -> 3.33333333333333333333 (20 decimales)
 */
export function div(a, b) {
  const divisor = toBig(b);
  if (divisor.eq('0')) return new Big('0');
  return toBig(a).div(divisor);
}

/**
 * Redondea a N decimales usando half-up (comercial).
 * Money.round(10.555, 2) -> 10.56
 * Money.round(10.554, 2) -> 10.55
 */
export function round(value, decimals = 2) {
  return toBig(value).round(decimals, 1); // 1 = half-up
}

/**
 * Redondea a 2 decimales (moneda).
 * Reemplazo directo de la antigua funcion m()
 */
export function m2(value) {
  return round(value, 2);
}

/**
 * Redondea a 3 decimales.
 * Reemplazo directo de la antigua funcion q()
 */
export function m3(value) {
  return round(value, 3);
}

/**
 * Convierte a numero JavaScript (solo para display o APIs externas).
 * ATENCION: Pierde precision. Usar solo al final del calculo.
 */
export function toNumber(value) {
  return toBig(value).toNumber();
}

/**
 * Convierte a string con N decimales fijos.
 * Money.toFixed(10.5, 2) -> "10.50"
 */
export function toFixed(value, decimals = 2) {
  return toBig(value).toFixed(decimals);
}

/**
 * Convierte a string sin ceros finales.
 * Money.toString(10.500) -> "10.5"
 */
export function toString(value) {
  return toBig(value).toString();
}

/**
 * Convierte a centavos enteros (para almacenamiento en DB).
 * Money.toCents(10.55) -> 1055
 */
export function toCents(value) {
  return toBig(value).times('100').round(0, 1).toNumber();
}

/**
 * Convierte centavos enteros a decimal.
 * Money.fromCents(1055) -> 10.55 (como Big)
 */
export function fromCents(cents) {
  return toBig(cents).div('100');
}

/**
 * Compara dos valores.
 * Money.eq(10.0, 10) -> true
 * Money.gt(10.1, 10) -> true
 * Money.lt(10, 10.1) -> true
 * Money.gte(10, 10) -> true
 * Money.lte(10, 10) -> true
 */
export function eq(a, b) { return toBig(a).eq(toBig(b)); }
export function gt(a, b) { return toBig(a).gt(toBig(b)); }
export function lt(a, b) { return toBig(a).lt(toBig(b)); }
export function gte(a, b) { return toBig(a).gte(toBig(b)); }
export function lte(a, b) { return toBig(a).lte(toBig(b)); }

/**
 * Valor absoluto.
 */
export function abs(value) {
  return toBig(value).abs();
}

/**
 * Maximo y minimo de un array de valores.
 */
export function max(...values) {
  return values.reduce((acc, v) => toBig(v).gt(acc) ? toBig(v) : acc, toBig(values[0]));
}
export function min(...values) {
  return values.reduce((acc, v) => toBig(v).lt(acc) ? toBig(v) : acc, toBig(values[0]));
}

/**
 * Suma un array de valores (para reemplazar .reduce((s, x) => s + n(x.monto), 0)).
 * Money.sum(arr, 'monto') -> Big
 * Money.sum(arr, v => v.precio * v.cantidad) -> Big
 */
export function sum(array, getter = null) {
  if (!array || !array.length) return new Big('0');
  if (typeof getter === 'string') {
    const field = getter;
    getter = (item) => item[field];
  }
  if (!getter) getter = (x) => x;
  return array.reduce((acc, item) => {
    const val = getter(item);
    return val === undefined || val === null ? acc : acc.plus(toBig(val));
  }, new Big('0'));
}

/**
 * Suma con filtro (reemplaza .filter(...).reduce(...)).
 * Money.sumWhere(ventas, v => !v.anulada, v => v.total) -> Big
 */
export function sumWhere(array, predicate, getter) {
  if (!array || !array.length) return new Big('0');
  if (typeof getter === 'string') {
    const field = getter;
    getter = (item) => item[field];
  }
  return array.reduce((acc, item) => {
    if (!predicate(item)) return acc;
    const val = getter(item);
    return val === undefined || val === null ? acc : acc.plus(toBig(val));
  }, new Big('0'));
}

/**
 * Calcula porcentaje.
 * Money.pct(20, 100) -> 20 (como Big)
 */
export function pct(part, total) {
  const t = toBig(total);
  if (t.eq('0')) return new Big('0');
  return toBig(part).div(t).times('100');
}

/**
 * Calcula margen de ganancia.
 * Money.margin(ganancia, ventas) -> Big (porcentaje)
 */
export function margin(ganancia, ventas) {
  const v = toBig(ventas);
  if (v.eq('0')) return new Big('0');
  return toBig(ganancia).div(v).times('100');
}

/**
 * Divide un monto en partes iguales sin perder centavos.
 * El resto se distribuye round-robin.
 * Money.allocate(100, 3) -> [33.34, 33.33, 33.33] (como Big[])
 */
export function allocate(amount, parts, decimals = 2) {
  const total = toBig(amount);
  const n = Math.max(1, parts);
  const base = total.div(String(n)).round(decimals, 1);
  const result = Array(n).fill(null).map(() => base);
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

/**
 * Funcion de utilidad para debugging.
 * Muestra el valor con su representacion interna.
 */
export function inspect(value) {
  const b = toBig(value);
  return {
    value: b.toString(),
    fixed2: b.toFixed(2),
    number: b.toNumber(),
    cents: toCents(b)
  };
}

// Re-export Big para casos avanzados
export { Big };
