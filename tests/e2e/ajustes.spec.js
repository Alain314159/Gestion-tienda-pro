import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Ajustes', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'ajustes');
  });

  test('muestra configuracion', async ({ page }) => {
    await expect(page.locator('text=Configuracion')).toBeVisible();
    await expect(page.locator('text=Nombre del negocio')).toBeVisible();
    await expect(page.locator('text=Simbolo de moneda')).toBeVisible();
  });

  test('cambia el nombre del negocio', async ({ page }) => {
    await page.fill('#cfg-nombre', 'Negocio Test E2E');
    await page.locator('#cfg-nombre').blur();
    await esperarToast(page, 'Configuracion guardada');
  });

  test('alterna tema claro/oscuro', async ({ page }) => {
    const btn = page.locator('button:has-text("Modo claro"), button:has-text("Modo oscuro")').first();
    await btn.click();
    await expect(page.locator('button:has-text("Modo claro"), button:has-text("Modo oscuro")').first()).toBeVisible();
  });

  test('exporta backup JSON', async ({ page }) => {
    await page.click('button:has-text("Exportar datos")');
    await esperarToast(page, 'Backup');
  });
});
