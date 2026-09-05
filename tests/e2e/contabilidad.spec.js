import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Contabilidad', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'contabilidad');
  });

  test('muestra libro diario', async ({ page }) => {
    await expect(page.locator('text=Libro Diario')).toBeVisible();
  });

  test('muestra estado de resultados', async ({ page }) => {
    await expect(page.locator('text=Estado de Resultados')).toBeVisible();
  });

  test('muestra balance general', async ({ page }) => {
    await expect(page.locator('text=Balance General')).toBeVisible();
  });

  test('cambia entre pestanas', async ({ page }) => {
    await page.click('text=Balance General');
    await expect(page.locator('text=Activos')).toBeVisible();
  });
});
