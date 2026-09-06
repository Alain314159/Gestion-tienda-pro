import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast, seedDB } from './setup.js';

test.describe('Compras', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await seedDB(page, {
      productos: [{ id: 'p1', nombre: 'Arroz Test', codigo: 'ARR-001', creado: new Date().toISOString() }],
      productoVariantes: [{ id: 'v1', productoId: 'p1', nombre: 'Arroz Test', precioBase: 25, stockMin: 10, unidad: 'kg', creado: new Date().toISOString() }],
    });
    await navegarA(page, 'compras');
  });

  test('registra una compra', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Arroz');
    await page.click('text=Arroz Test');
    await page.fill('input[placeholder="Cantidad"]', '50');
    await page.fill('input[placeholder*="Costo unit"]', '18');
    await page.click('button:has-text("Registrar Compra")');
    await esperarToast(page, 'Compra');
  });

  test('muestra historial de compras', async ({ page }) => {
    await expect(page.locator('text=Historial de Compras')).toBeVisible();
  });
});
