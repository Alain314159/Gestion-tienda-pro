import { n } from './util.js';

export function diasConVentas(ventas, mes, anio) {
  const map = {};
  ventas.filter(v => !v.anulada).forEach(v => {
    const d = new Date(v.fecha);
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
  const f = new Date(fechaStr);
  f.setHours(0, 0, 0, 0);
  const next = new Date(f);
  next.setDate(next.getDate() + 1);
  return ventas.filter(v => {
    const vf = new Date(v.fecha);
    return !v.anulada && vf >= f && vf < next;
  });
}
