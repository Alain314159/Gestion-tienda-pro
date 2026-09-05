import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Analisis', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'analisis');
  });

  test('muestra graficos de ventas', async ({ page }) => {
    await expect(page.locator('text=Analisis')).toBeVisible();
  });

  test('muestra productos top', async ({ page }) => {
    await expect(page.locator('text=Top Productos')).toBeVisible();
  });

  test('muestra tendencias', async ({ page }) => {
    await expect(page.locator('text=Tendencias')).toBeVisible();
  });
});
