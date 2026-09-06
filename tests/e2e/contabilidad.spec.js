import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Contabilidad', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'contabilidad');
  });

  test('muestra tabs de contabilidad', async ({ page }) => {
    await expect(page.locator('text=Libro Diario')).toBeVisible();
  });

  test('navega a Estado de Resultados', async ({ page }) => {
    await page.click('button:has-text("Estado de Resultados")');
    await expect(page.locator('text=Ingresos')).toBeVisible();
  });

  test('navega a Balance General', async ({ page }) => {
    await page.click('button:has-text("Balance General")');
    await expect(page.locator('text=Activos')).toBeVisible();
    await expect(page.locator('text=Patrimonio')).toBeVisible();
  });
});
