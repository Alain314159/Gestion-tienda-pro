import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast, seedDB } from './setup.js';

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await seedDB(page, {
      productos: [{ id: 'p1', nombre: 'Cereal E2E', codigo: 'CER-E2E', creado: new Date().toISOString() }],
      productoVariantes: [{ id: 'v1', productoId: 'p1', nombre: 'Caja x12', precioBase: 45, stockMin: 5, unidad: 'caja', creado: new Date().toISOString() }],
      lotes: [{ id: 'l1', varianteId: 'v1', cantidadInicial: 20, cantidadVendida: 0, costoUnitario: 30, fecha: new Date().toISOString() }],
    });
    await navegarA(page, 'ventas');
  });

  test('registra una venta', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Cereal');
    await page.click('text=Cereal E2E');
    await page.click('button:has-text("Cobrar Venta")');
    await page.fill('input[placeholder*="Efectivo recibido"]', '100');
    await page.click('button:has-text("Confirmar Pago")');
    await esperarToast(page, 'Venta registrada');
  });

  test('limpia el carrito', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Cereal');
    await page.click('text=Cereal E2E');
    await page.click('button:has-text("Limpiar carrito")');
    await expect(page.locator('text=Cereal E2E')).not.toBeVisible();
  });

  test('muestra historial de ventas', async ({ page }) => {
    await expect(page.locator('text=Historial de Ventas')).toBeVisible();
  });
});
