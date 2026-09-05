import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Cuadre de Caja', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'cuadre');
  });

  test('muestra estado de caja', async ({ page }) => {
    await expect(page.locator('text=Cuadre de Caja')).toBeVisible();
  });

  test('muestra lista de cierres anteriores', async ({ page }) => {
    await expect(page.locator('text=Cierres Anteriores')).toBeVisible();
  });

  test('cierra caja correctamente', async ({ page }) => {
    await page.click('button:has-text("Cerrar Caja")');
    await expect(page.locator('text=Confirmar Cierre')).toBeVisible();
    await page.click('button:has-text("Confirmar")');
    await esperarToast(page, 'Caja cerrada');
  });
});
