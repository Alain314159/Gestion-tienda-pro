import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast, seedDB } from './setup.js';

test.describe('Inventario', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await seedDB(page, {
      productos: [{ id: 'p1', nombre: 'Leche Test', codigo: 'LEC-001', creado: new Date().toISOString() }],
      productoVariantes: [{ id: 'v1', productoId: 'p1', nombre: 'Leche Test', precioBase: 30, stockMin: 5, unidad: 'lt', creado: new Date().toISOString() }],
      lotes: [{ id: 'l1', varianteId: 'v1', cantidadInicial: 10, cantidadVendida: 0, costoUnitario: 20, fecha: new Date().toISOString() }],
    });
    await navegarA(page, 'inventario');
  });

  test('muestra valor del inventario', async ({ page }) => {
    await expect(page.locator('text=Valor del Inventario')).toBeVisible();
  });

  test('registra una merma', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Leche');
    await page.click('text=Leche Test');
    await page.fill('input[placeholder*="merma / + sobrante"]', '-2');
    await page.selectOption('select', 'merma');
    await page.click('button:has-text("Registrar Ajuste")');
    await esperarToast(page, 'Merma registrada');
  });
});
