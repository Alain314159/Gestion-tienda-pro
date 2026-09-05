import { describe, it, expect, vi } from 'vitest';
import {
  fuzzySearch, fuzzySearchScored, fmtFecha, fmtFH, calcFIFOVariante,
  stockVariante, lotesDeVariante, valorLotesVariante, badgeStockVariante,
  inventarioGrupos, topRentables, datosChart6Meses, toCentsDeep, fromCentsDeep,
  escapeHtml, validateWebhookUrl, nowLocal, isoToLocal, mismoDiaLocal,
  genId, vib, clean, debounce
} from '../../src/core/util.js';

describe('util.js - Funciones adicionales', () => {
  describe('fuzzySearch()', () => {
    const items = ['Detergente 1kg', 'Jabon 500gr', 'Shampoo 300ml', 'ARROZ 5kg'];

    it('encuentra coincidencias parciales', () => {
      const res = fuzzySearch(items, 'det 1', (x) => x);
      expect(res).toContain('Detergente 1kg');
    });

    it('es case insensitive', () => {
      const res = fuzzySearch(items, 'ARROZ', (x) => x);
      expect(res).toContain('ARROZ 5kg');
    });

    it('requiere todos los tokens', () => {
      const res = fuzzySearch(items, 'det 5kg', (x) => x);
      expect(res.length).toBe(0);
    });

    it('devuelve todos con query vacia', () => {
      const res = fuzzySearch(items, '', (x) => x);
      expect(res.length).toBe(4);
    });

    it('funciona sin getter (array de strings)', () => {
      const res = fuzzySearch(items, 'jab');
      expect(res).toContain('Jabon 500gr');
    });
  });

  describe('fuzzySearchScored()', () => {
    const items = ['Detergente', 'Jabon', 'Desodorante'];

    it('ordena por mejor coincidencia', () => {
      const res = fuzzySearchScored(items, 'det', (x) => x);
      expect(res[0].item).toBe('Detergente'); // startsWith = +3
    });

    it('da mayor score a startsWith', () => {
      const items2 = ['Detergente', 'Jabon de Manos'];
      const res = fuzzySearchScored(items2, 'de', (x) => x);
      const deter = res.find(r => r.item === 'Detergente');
      const jabon = res.find(r => r.item === 'Jabon de Manos');
      expect(deter).toBeDefined();
      expect(jabon).toBeDefined();
      expect(deter.score).toBeGreaterThan(jabon.score);
    });

    it('devuelve score 0 para query vacia', () => {
      const res = fuzzySearchScored(items, '', (x) => x);
      expect(res.length).toBe(3);
      expect(res[0].score).toBe(0);
    });

    it('filtra items sin coincidencia', () => {
      const res = fuzzySearchScored(items, 'xyz', (x) => x);
      expect(res.length).toBe(0);
    });
  });

  describe('fmtFecha()', () => {
    it('formatea fecha ISO a dd/mm/yy', () => {
      expect(fmtFecha('2024-06-15T12:00:00.000Z')).toMatch(/15\/06\/24/);
    });

    it('maneja fecha invalida', () => {
      expect(fmtFecha('invalid')).toMatch(/NaN/);
    });
  });

  describe('fmtFH()', () => {
    it('formatea fecha + hora', () => {
      const res = fmtFH('2024-06-15T14:30:00.000Z');
      expect(res).toMatch(/15\/06\/24/);
      expect(res).toMatch(/14:30/);
    });

    it('maneja fecha invalida', () => {
      expect(fmtFH('invalid')).toMatch(/NaN/);
    });
  });

  describe('calcFIFOVariante()', () => {
    const lotes = [
      { id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 0, costo: 5, fecha: '2024-01-01' },
      { id: 'l2', varianteId: 'v1', cantidadInicial: 5, cantidadVendida: 0, costo: 6, fecha: '2024-01-02' },
      { id: 'l3', varianteId: 'v2', cantidadInicial: 20, cantidadVendida: 0, costo: 3, fecha: '2024-01-01' },
    ];

    it('calcula FIFO por variante correctamente', () => {
      const res = calcFIFOVariante(lotes, 'v1', 12);
      expect(res.error).toBeUndefined();
      expect(res.costoTotal).toBe(62); // 10*5 + 2*6
      expect(res.usados.length).toBe(2);
    });

    it('ignora lotes de otras variantes', () => {
      const res = calcFIFOVariante(lotes, 'v2', 5);
      expect(res.error).toBeUndefined();
      expect(res.usados[0].loteId).toBe('l3');
    });

    it('detecta stock insuficiente por variante', () => {
      const res = calcFIFOVariante(lotes, 'v1', 20);
      expect(res.error).toBeDefined();
    });
  });

  describe('stockVariante()', () => {
    const lotes = [
      { id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 3 },
      { id: 'l2', varianteId: 'v1', cantidadInicial: 5, cantidadVendida: 0 },
      { id: 'l3', varianteId: 'v2', cantidadInicial: 20, cantidadVendida: 0 },
    ];

    it('suma stock de una variante especifica', () => {
      expect(stockVariante(lotes, 'v1')).toBe(12);
    });

    it('ignora lotes de otras variantes', () => {
      expect(stockVariante(lotes, 'v2')).toBe(20);
    });
  });

  describe('lotesDeVariante()', () => {
    const lotes = [
      { id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 0, fecha: '2024-01-02' },
      { id: 'l2', varianteId: 'v1', cantidadInicial: 5, cantidadVendida: 5, fecha: '2024-01-01' },
      { id: 'l3', varianteId: 'v1', cantidadInicial: 3, cantidadVendida: 0, fecha: '2024-01-03' },
    ];

    it('filtra solo lotes activos de la variante', () => {
      const res = lotesDeVariante(lotes, 'v1');
      expect(res.length).toBe(2); // l1 y l3 (l2 agotado)
    });

    it('ordena por fecha', () => {
      const res = lotesDeVariante(lotes, 'v1');
      expect(res[0].id).toBe('l1');
      expect(res[1].id).toBe('l3');
    });
  });

  describe('valorLotesVariante()', () => {
    const lotes = [
      { id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 3, costo: 5 },
      { id: 'l2', varianteId: 'v1', cantidadInicial: 5, cantidadVendida: 0, costo: 6 },
    ];

    it('calcula valor de lotes de variante', () => {
      expect(valorLotesVariante(lotes, 'v1')).toBe(65); // 7*5 + 5*6
    });
  });

  describe('badgeStockVariante()', () => {
    const lotes = [
      { id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 10 },
      { id: 'l2', varianteId: 'v2', cantidadInicial: 10, cantidadVendida: 8 },
      { id: 'l3', varianteId: 'v3', cantidadInicial: 10, cantidadVendida: 5 },
    ];

    it('detecta agotado', () => {
      const res = badgeStockVariante({ id: 'v1', archivado: false, stockMinimo: 5 }, lotes);
      expect(res.clase).toBe('out');
    });

    it('detecta bajo stock', () => {
      const res = badgeStockVariante({ id: 'v2', archivado: false, stockMinimo: 5 }, lotes);
      expect(res.clase).toBe('low');
    });

    it('detecta ok', () => {
      const res = badgeStockVariante({ id: 'v3', archivado: false, stockMinimo: 3 }, lotes);
      expect(res.clase).toBe('ok');
    });

    it('detecta archivado', () => {
      const res = badgeStockVariante({ id: 'v1', archivado: true, stockMinimo: 5 }, lotes);
      expect(res.clase).toBe('arch');
    });
  });

  describe('inventarioGrupos()', () => {
    const productos = [{ id: 'p1', nombre: 'Producto A' }];
    const variantes = [{ id: 'v1', nombre: '500gr', unidad: 'gr', productoId: 'p1' }];
    const lotes = [
      { id: 'l1', productoId: 'p1', varianteId: 'v1', productoNombre: '500gr', cantidadInicial: 10, cantidadVendida: 3, costo: 5 },
    ];

    it('agrupa por variante', () => {
      const res = inventarioGrupos(productos, variantes, lotes);
      expect(res.length).toBe(1);
      expect(res[0].stockTotal).toBe(7);
      expect(res[0].valorTotal).toBe(35);
    });

    it('ordena por valor descendente', () => {
      const lotes2 = [
        ...lotes,
        { id: 'l2', productoId: 'p1', varianteId: 'v2', productoNombre: '1kg', cantidadInicial: 5, cantidadVendida: 0, costo: 10 },
      ];
      const variantes2 = [...variantes, { id: 'v2', nombre: '1kg', unidad: 'kg', productoId: 'p1' }];
      const res = inventarioGrupos(productos, variantes2, lotes2);
      expect(res[0].varianteId).toBe('v2'); // 50 > 35
    });
  });

  describe('topRentables()', () => {
    const now = new Date();
    const ventas = [
      { fecha: now.toISOString(), anulada: false, items: [{ productoId: 'p1', nombre: 'A', ganancia: 50 }, { productoId: 'p2', nombre: 'B', ganancia: 30 }] },
      { fecha: now.toISOString(), anulada: false, items: [{ productoId: 'p1', nombre: 'A', ganancia: 20 }, { productoId: 'p3', nombre: 'C', ganancia: 100 }] },
    ];

    it('ordena productos por ganancia total', () => {
      const res = topRentables(ventas);
      expect(res[0].nombre).toBe('C');
      expect(res[1].nombre).toBe('A');
      expect(res[2].nombre).toBe('B');
    });

    it('ignora ventas anuladas', () => {
      const ventasAnuladas = [
        ...ventas,
        { fecha: now.toISOString(), anulada: true, items: [{ productoId: 'p4', nombre: 'D', ganancia: 999 }] },
      ];
      const res = topRentables(ventasAnuladas);
      expect(res.find(r => r.nombre === 'D')).toBeUndefined();
    });
  });

  describe('datosChart6Meses()', () => {
    const now = new Date();
    const ventas = [
      { fecha: now.toISOString(), total: 100, ganancia: 30, anulada: false },
      { fecha: now.toISOString(), total: 200, ganancia: 50, anulada: false },
    ];

    it('agrrega ventas por mes', () => {
      const res = datosChart6Meses(ventas);
      expect(res.length).toBe(6);
      const actual = res.find(r => r.m === now.getMonth() && r.y === now.getFullYear());
      expect(actual).toBeDefined();
      expect(actual.v).toBe(300);
      expect(actual.g).toBe(80);
    });

    it('ignora ventas anuladas', () => {
      const ventasConAnulada = [
        ...ventas,
        { fecha: now.toISOString(), total: 50, ganancia: 10, anulada: true },
      ];
      const res = datosChart6Meses(ventasConAnulada);
      const actual = res.find(r => r.m === now.getMonth() && r.y === now.getFullYear());
      expect(actual.v).toBe(300); // no 350
    });
  });

  describe('toCentsDeep() / fromCentsDeep()', () => {
    it('convierte campos monetarios a centavos', () => {
      const obj = { precio: 10.5, cantidad: 3 };
      const res = toCentsDeep(obj, ['precio']);
      expect(res.precio).toBe(1050);
      expect(res.cantidad).toBe(3);
    });

    it('convierte campos anidados', () => {
      const obj = { item: { precio: 5.25 } };
      const res = toCentsDeep(obj, [], { item: ['precio'] });
      expect(res.item.precio).toBe(525);
    });

    it('fromCentsDeep revierte la conversion', () => {
      const obj = { precio: 1050 };
      const res = fromCentsDeep(obj, ['precio']);
      expect(res.precio).toBe(10.5);
    });
  });

  describe('escapeHtml()', () => {
    it('escapa caracteres peligrosos', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapa comillas', () => {
      expect(escapeHtml('"test"')).toBe('&quot;test&quot;');
    });

    it('no modifica strings seguros', () => {
      expect(escapeHtml('Hola mundo')).toBe('Hola mundo');
    });

    it('no modifica no-strings', () => {
      expect(escapeHtml(42)).toBe(42);
    });
  });

  describe('validateWebhookUrl()', () => {
    it('acepta HTTPS valido', () => {
      expect(validateWebhookUrl('https://example.com/webhook')).toEqual({ ok: true });
    });

    it('rechaza HTTP', () => {
      expect(validateWebhookUrl('http://example.com')).toEqual({ ok: false, error: 'Solo se permiten URLs HTTPS' });
    });

    it('rechaza localhost', () => {
      expect(validateWebhookUrl('https://localhost:3000')).toEqual({ ok: false, error: 'No se permiten URLs de red local' });
    });

    it('rechaza 127.0.0.1', () => {
      expect(validateWebhookUrl('https://127.0.0.1')).toEqual({ ok: false, error: 'No se permiten URLs de red local' });
    });

    it('rechaza URL invalida', () => {
      expect(validateWebhookUrl('no-es-url')).toEqual({ ok: false, error: 'URL invalida' });
    });
  });

  describe('nowLocal()', () => {
    it('devuelve iso, local y offset', () => {
      const res = nowLocal();
      expect(res.iso).toBeDefined();
      expect(res.local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof res.offset).toBe('number');
    });
  });

  describe('isoToLocal()', () => {
    it('extrae fecha local de ISO', () => {
      const res = isoToLocal('2024-06-15T12:00:00.000Z');
      expect(res).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('mismoDiaLocal()', () => {
    it('detecta mismo dia', () => {
      expect(mismoDiaLocal('2024-06-15T10:00:00.000Z', '2024-06-15T22:00:00.000Z')).toBe(true);
    });

    it('detecta dias diferentes', () => {
      expect(mismoDiaLocal('2024-06-15T10:00:00.000Z', '2024-06-16T10:00:00.000Z')).toBe(false);
    });
  });

  describe('genId()', () => {
    it('genera ID con prefijo', () => {
      const id = genId('test_');
      expect(id.startsWith('test_')).toBe(true);
    });

    it('genera IDs unicos', () => {
      const ids = new Set(Array.from({ length: 100 }, () => genId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('vib()', () => {
    it('no lanza error sin navigator.vibrate', () => {
      expect(() => vib(50)).not.toThrow();
    });
  });

  describe('clean()', () => {
    it('hace deep clone de objetos', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = clean(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('devuelve primitivos sin cambios', () => {
      expect(clean(42)).toBe(42);
      expect(clean('hola')).toBe('hola');
      expect(clean(null)).toBe(null);
    });
  });

  describe('debounce()', () => {
    it('retrasa la ejecucion', async () => {
      let called = 0;
      const fn = debounce(() => called++, 50);
      fn();
      fn();
      fn();
      expect(called).toBe(0);
      await new Promise(r => setTimeout(r, 100));
      expect(called).toBe(1);
    });

    it('pasa argumentos correctamente', async () => {
      let result;
      const fn = debounce((x) => { result = x; }, 10);
      fn(42);
      await new Promise(r => setTimeout(r, 50));
      expect(result).toBe(42);
    });
  });
});
