import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Caja', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'caja');
  });

  test('muestra saldo de caja', async ({ page }) => {
    await expect(page.locator('text=Saldo de Caja')).toBeVisible();
  });

  test('muestra movimientos de caja', async ({ page }) => {
    await expect(page.locator('text=Movimientos')).toBeVisible();
  });

  test('registra un arqueo con sobrante', async ({ page }) => {
    await page.fill('input[placeholder*="Monto fisico"]', '150');
    await page.fill('input[placeholder*="Nota"]', 'Arqueo test');
    await page.click('button:has-text("Registrar Arqueo")');
    await esperarToast(page, 'Arqueo');
  });

  test('registra un retiro de ganancia', async ({ page }) => {
    await page.fill('input[placeholder*="Monto"]', '50');
    await page.fill('input[placeholder*="Concepto"]', 'Retiro test');
    await page.click('button:has-text("Retirar")');
    await esperarToast(page, 'Retiro');
  });
});
