import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Tiendas', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'tiendas');
  });

  test('muestra lista de tiendas', async ({ page }) => {
    await expect(page.locator('text=Tiendas')).toBeVisible();
  });

  test('crea una tienda nueva', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre"]', 'Tienda Test');
    await page.click('button:has-text("Crear Tienda")');
    await esperarToast(page, 'Tienda');
  });
});
