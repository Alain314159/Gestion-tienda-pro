import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Ajustes', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'ajustes');
  });

  test('muestra panel de ajustes', async ({ page }) => {
    await expect(page.locator('text=Ajustes')).toBeVisible();
  });

  test('cambia moneda', async ({ page }) => {
    await page.selectOption('select[name="moneda"]', 'USD');
    await page.click('button:has-text("Guardar")');
    await esperarToast(page, 'Guardado');
  });

  test('configura webhook', async ({ page }) => {
    await page.fill('input[placeholder*="URL webhook"]', 'https://example.com/webhook');
    await page.click('button:has-text("Guardar")');
    await esperarToast(page, 'Guardado');
  });
});
