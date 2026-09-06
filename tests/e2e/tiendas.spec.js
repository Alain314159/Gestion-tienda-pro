import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Tiendas', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'tiendas');
  });

  test('muestra lista de tiendas', async ({ page }) => {
    await expect(page.locator('text=Mis Tiendas')).toBeVisible();
  });

  test('crea una tienda', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre unico"]', 'Tienda Test E2E');
    await page.click('button:has-text("Crear Tienda")');
    await esperarToast(page, 'Tienda creada');
    await expect(page.locator('text=Tienda Test E2E')).toBeVisible();
  });

  test('activa una tienda', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre unico"]', 'Tienda Activa');
    await page.click('button:has-text("Crear Tienda")');
    await esperarToast(page, 'Tienda creada');
    await page.click('button:has-text("Activar")');
    await esperarToast(page, 'Activada');
  });
});
