export const n = v => Number(v) || 0;
export function fmt(v) {
  return n(v).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtCant(v) {
  const x = n(v);
  return Number.isInteger(x) ? String(x) : x.toLocaleString('es', { maximumFractionDigits: 3 });
}
export function fmtFecha(t) {
  return new Date(t).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtFH(t) {
  const d = new Date(t);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' ' +
         d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
export function slug(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'dato';
}
