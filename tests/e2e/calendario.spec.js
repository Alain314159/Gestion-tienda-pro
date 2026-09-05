import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Calendario', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'calendario');
  });

  test('muestra calendario del mes actual', async ({ page }) => {
    await expect(page.locator('text=Calendario')).toBeVisible();
  });

  test('navega a mes siguiente', async ({ page }) => {
    await page.click('button[aria-label="Mes siguiente"]');
    await expect(page.locator('text=Calendario')).toBeVisible();
  });

  test('navega a mes anterior', async ({ page }) => {
    await page.click('button[aria-label="Mes anterior"]');
    await expect(page.locator('text=Calendario')).toBeVisible();
  });
});
