import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Reportes', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'reportes');
  });

  test('muestra panel de reportes', async ({ page }) => {
    await expect(page.locator('text=Reportes')).toBeVisible();
  });

  test('genera reporte de ventas', async ({ page }) => {
    await page.click('button:has-text("Generar Reporte")');
    await expect(page.locator('text=Ingresos')).toBeVisible();
  });

  test('exporta a PDF', async ({ page }) => {
    await page.click('button:has-text("Exportar PDF")');
    await expect(page.locator('button:has-text("Exportar PDF")')).toBeVisible();
  });
});
