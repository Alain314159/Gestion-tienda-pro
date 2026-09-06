import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Caja', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'caja');
  });

  test('muestra saldo y movimientos', async ({ page }) => {
    await expect(page.locator('text=Caja')).toBeVisible();
    await expect(page.locator('text=Movimientos')).toBeVisible();
  });

  test('registra un arqueo', async ({ page }) => {
    await page.fill('input[type="number"]', '1000');
    await page.fill('input[type="text"]', 'Arqueo inicial');
    await page.click('button:has-text("Registrar Arqueo")');
    await esperarToast(page, 'Arqueo');
  });
});
