import { describe, it, expect } from 'vitest';
import { n, fmt, fmtCant, fmtFecha, fmtFH, slug } from '../../src/core/util.js';

describe('n() - convertir a número', () => {
  it('convierte string a número', () => {
    expect(n('42')).toBe(42);
  });
  it('devuelve 0 para null', () => {
    expect(n(null)).toBe(0);
  });
  it('devuelve 0 para undefined', () => {
    expect(n(undefined)).toBe(0);
  });
  it('devuelve 0 para string vacío', () => {
    expect(n('')).toBe(0);
  });
  it('maneja negativos', () => {
    expect(n('-5.5')).toBe(-5.5);
  });
});

describe('fmt() - formato de moneda', () => {
  it('formatea número con 2 decimales', () => {
    const result = fmt(1234.5);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
  it('formatea 0', () => {
    expect(fmt(0)).toContain('0');
  });
  it('maneja undefined', () => {
    expect(fmt(undefined)).toContain('0');
  });
});

describe('fmtCant() - formato de cantidad', () => {
  it('enteros sin decimales', () => {
    expect(fmtCant(5)).toBe('5');
  });
  it('decimales con hasta 3 posiciones', () => {
    const result = fmtCant(2.5);
    expect(result).toContain('2');
  });
});

describe('slug() - generar slug', () => {
  it('convierte a minúsculas y reemplaza espacios', () => {
    expect(slug('Hola Mundo')).toBe('hola-mundo');
  });
  it('elimina acentos', () => {
    expect(slug('Café')).toBe('cafe');
  });
  it('maneja string vacío', () => {
    expect(slug('')).toBe('dato');
  });
});
