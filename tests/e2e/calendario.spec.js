import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Calendario', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'calendario');
  });

  test('muestra el calendario del mes actual', async ({ page }) => {
    await expect(page.locator('text=Calendario')).toBeVisible();
  });

  test('navega entre meses con los botones de flecha', async ({ page }) => {
    const mesActual = await page.locator('h2').first().textContent();
    await page.locator('button').first().click();
    await page.waitForTimeout(300);
    const mesAnterior = await page.locator('h2').first().textContent();
    expect(mesAnterior).not.toBe(mesActual);

    await page.locator('button').nth(1).click();
    await page.waitForTimeout(300);
    const mesRestaurado = await page.locator('h2').first().textContent();
    expect(mesRestaurado).toBe(mesActual);
  });

  test('selecciona un dia y muestra ventas', async ({ page }) => {
    const dias = page.locator('button').filter({ hasText: /^\d+$/ });
    const count = await dias.count();
    if (count > 0) {
      await dias.first().click();
      await expect(page.locator('text=Ventas del dia')).toBeVisible();
    }
  });
});
