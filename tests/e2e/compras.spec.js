import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Compras', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'productos');
    await page.fill('input[placeholder*="Nombre del producto"]', 'Arroz Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');
    await navegarA(page, 'compras');
  });

  test('registra una compra', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Arroz');
    await page.click('text=Arroz Test');
    await page.click('text=Arroz Test');

    await page.fill('input[placeholder="Cantidad"]', '50');
    await page.fill('input[placeholder="Costo unit."]', '12.50');

    await page.click('button:has-text("Registrar Compra")');
    await esperarToast(page, 'Compra');
  });

  test('no permite compra sin variante seleccionada', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Arroz');
    await page.click('text=Arroz Test');
    await expect(page.locator('button:has-text("Registrar Compra")')).not.toBeVisible();
  });

  test('muestra historial de compras', async ({ page }) => {
    await expect(page.locator('text=Historial de Compras')).toBeVisible();
  });
});
