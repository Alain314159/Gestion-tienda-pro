import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Patrimonio', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'patrimonio');
  });

  test('muestra lista de activos', async ({ page }) => {
    await expect(page.locator('text=Patrimonio')).toBeVisible();
  });

  test('muestra valor total', async ({ page }) => {
    await expect(page.locator('text=Valor Total')).toBeVisible();
  });

  test('agrega un activo', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre"]', 'Computadora');
    await page.fill('input[placeholder*="Valor"]', '5000');
    await page.click('button:has-text("Agregar")');
    await esperarToast(page, 'Activo');
  });
});
