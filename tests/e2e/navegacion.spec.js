import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA } from './setup.js';

test.describe('Navegacion', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await page.goto('/');
    await page.waitForSelector('text=Cargando Tienda Pro...', { state: 'detached', timeout: 15000 });
  });

  test('carga la app y muestra el header', async ({ page }) => {
    await expect(page.locator('h1:has-text("Tienda Pro")')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('navega a Productos desde el menu', async ({ page }) => {
    await page.locator('button[aria-label="Productos"]').click();
    await expect(page.locator('text=Agregar Producto Base')).toBeVisible();
  });

  test('navega a Ventas desde el menu', async ({ page }) => {
    await page.locator('button[aria-label="Ventas"]').click();
    await expect(page.locator('text=Registrar Venta')).toBeVisible();
  });

  test('navega a Compras desde el menu', async ({ page }) => {
    await page.locator('button[aria-label="Compras"]').click();
    await expect(page.locator('text=Registrar Compra')).toBeVisible();
  });

  test('navega a Inventario desde el menu', async ({ page }) => {
    await page.locator('button[aria-label="Inventario"]').click();
    await expect(page.locator('text=Valor del Inventario')).toBeVisible();
  });

  test('abre y cierra el menu "Mas"', async ({ page }) => {
    await page.locator('button[aria-label="Menu de modulos"]').click();
    await expect(page.locator('text=Mas modulos')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Mas modulos')).not.toBeVisible();
  });

  test('alterna tema claro/oscuro', async ({ page }) => {
    const btn = page.locator('button:has-text("Claro"), button:has-text("Oscuro")').first();
    await btn.click();
    await expect(page.locator('button:has-text("Claro"), button:has-text("Oscuro")').first()).toBeVisible();
  });
});
