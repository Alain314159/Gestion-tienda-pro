import { n, isoToLocal } from './util.js';

export function diasConVentas(ventas, mes, anio) {
  const map = {};
  ventas.filter(v => !v.anulada).forEach(v => {
    const local = isoToLocal(v.fecha);
    const d = new Date(local + 'T00:00:00');
    if (d.getMonth() === mes && d.getFullYear() === anio) {
      const dia = d.getDate();
      if (!map[dia]) map[dia] = { ventas: 0, ganancia: 0, count: 0 };
      map[dia].ventas += n(v.total);
      map[dia].ganancia += n(v.ganancia);
      map[dia].count++;
    }
  });
  return map;
}

export function ventasDelDia(ventas, fechaStr) {
  const f = isoToLocal(fechaStr);
  return ventas.filter(v => {
    const vf = isoToLocal(v.fecha);
    return !v.anulada && vf === f;
  });
}
