import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Cuadre', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'cuadre');
  });

  test('muestra KPIs del cuadre', async ({ page }) => {
    await expect(page.locator('text=Fecha del cuadre')).toBeVisible();
    await expect(page.locator('text=VENTAS')).toBeVisible();
    await expect(page.locator('text=COSTO')).toBeVisible();
    await expect(page.locator('text=GANANCIA NETA')).toBeVisible();
  });

  test('agrega un gasto operativo', async ({ page }) => {
    await page.click('button:has-text("+ Agregar gasto")');
    await esperarToast(page, 'Gasto');
  });

  test('agrega un socio', async ({ page }) => {
    await page.click('button:has-text("+ Agregar socio")');
    await esperarToast(page, 'socio');
  });

  test('exporta PDF', async ({ page }) => {
    await page.click('button:has-text("Exportar PDF")');
    await esperarToast(page, 'PDF');
  });
});
