import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Inventario', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'productos');
    await page.fill('input[placeholder*="Nombre del producto"]', 'Leche Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await navegarA(page, 'compras');
    await page.fill('input[placeholder*="Buscar producto"]', 'Leche');
    await page.click('text=Leche Test');
    await page.click('text=Leche Test');
    await page.fill('input[placeholder="Cantidad"]', '50');
    await page.fill('input[placeholder="Costo unit."]', '8.00');
    await page.click('button:has-text("Registrar Compra")');
    await esperarToast(page, 'Compra');

    await navegarA(page, 'inventario');
  });

  test('muestra valor del inventario', async ({ page }) => {
    await expect(page.locator('text=Valor del Inventario')).toBeVisible();
  });

  test('registra un ajuste positivo (sobrante)', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Leche');
    await page.click('text=Leche Test');
    await page.click('text=Leche Test');

    await page.fill('input[placeholder*="merma / + sobrante"]', '10');
    await page.selectOption('select', 'sobrante');
    await page.fill('input[placeholder*="Costo unit. del sobrante"]', '8.00');

    await page.click('button:has-text("Registrar Ajuste")');
    await esperarToast(page, 'Sobrante registrado');
  });

  test('registra una merma (ajuste negativo)', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Leche');
    await page.click('text=Leche Test');
    await page.click('text=Leche Test');

    await page.fill('input[placeholder*="merma / + sobrante"]', '-5');
    await page.selectOption('select', 'merma');

    await page.click('button:has-text("Registrar Ajuste")');
    await esperarToast(page, 'Merma registrada');
  });

  test('no permite merma mayor al stock', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar producto"]', 'Leche');
    await page.click('text=Leche Test');
    await page.click('text=Leche Test');

    await page.fill('input[placeholder*="merma / + sobrante"]', '-100');
    await page.selectOption('select', 'merma');

    await page.click('button:has-text("Registrar Ajuste")');
    await esperarToast(page, 'Solo hay');
  });
});
