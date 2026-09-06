import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Analisis', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'analisis');
  });

  test('muestra KPIs de analisis', async ({ page }) => {
    await expect(page.locator('text=PRODUCTOS')).toBeVisible();
    await expect(page.locator('text=GANANCIA')).toBeVisible();
    await expect(page.locator('text=VOLUMEN')).toBeVisible();
  });
});
