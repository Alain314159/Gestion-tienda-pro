import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Reportes', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'reportes');
  });

  test('muestra formulario de reportes', async ({ page }) => {
    await expect(page.locator('text=Generar Reporte')).toBeVisible();
    await expect(page.locator('text=Ingresos')).toBeVisible();
  });

  test('genera un reporte con fechas', async ({ page }) => {
    const hoy = new Date().toISOString().slice(0, 10);
    const inicio = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').first().fill(inicio);
    await page.locator('input[type="date"]').nth(1).fill(hoy);
    await page.click('button:has-text("Generar Reporte")');
    await expect(page.locator('text=Ganancia neta')).toBeVisible();
  });

  test('exporta CSV', async ({ page }) => {
    const hoy = new Date().toISOString().slice(0, 10);
    await page.locator('input[type="date"]').first().fill(hoy);
    await page.locator('input[type="date"]').nth(1).fill(hoy);
    await page.click('button:has-text("Generar Reporte")');
    await page.click('button:has-text("Exportar CSV")');
    await esperarToast(page, 'CSV');
  });
});
