import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Patrimonio', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'patrimonio');
  });

  test('muestra patrimonio total', async ({ page }) => {
    await expect(page.locator('text=Patrimonio Total')).toBeVisible();
    await expect(page.locator('text=Resumen')).toBeVisible();
  });

  test('registra un retiro', async ({ page }) => {
    await page.locator('input[type="number"]').first().fill('50');
    await page.locator('input[type="text"]').first().fill('Retiro test');
    await page.click('button:has-text("Retirar Ganancia")');
    await esperarToast(page, 'Retiro');
  });

  test('registra un aporte', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(1).fill('100');
    await page.locator('input[type="text"]').nth(1).fill('Aporte test');
    await page.click('button:has-text("Registrar Aporte")');
    await esperarToast(page, 'Aporte');
  });

  test('cambia a tab Movimientos', async ({ page }) => {
    await page.click('button:has-text("Movimientos")');
    await expect(page.locator('text=Historial')).toBeVisible();
  });
});
