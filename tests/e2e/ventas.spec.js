import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'productos');
    await page.fill('input[placeholder*="Nombre del producto"]', 'Galletas Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await navegarA(page, 'compras');
    await page.fill('input[placeholder*="Buscar producto"]', 'Galletas');
    await page.click('text=Galletas Test');
    await page.click('text=Galletas Test');
    await page.fill('input[placeholder="Cantidad"]', '100');
    await page.fill('input[placeholder="Costo unit."]', '5.00');
    await page.click('button:has-text("Registrar Compra")');
    await esperarToast(page, 'Compra');

    await navegarA(page, 'ventas');
  });

  test('busca variante y agrega al carrito', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Galletas');
    await page.click('text=Galletas Test');
    await expect(page.locator('text=Cobrar Venta')).toBeVisible();
    await expect(page.locator('text=Galletas Test')).toBeVisible();
  });

  test('cambia cantidad en carrito', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Galletas');
    await page.click('text=Galletas Test');

    await page.locator('button[aria-label="Aumentar cantidad"]').first().click();
    await expect(page.locator('text=2')).toBeVisible();

    await page.locator('button[aria-label="Disminuir cantidad"]').first().click();
    await expect(page.locator('text=1')).toBeVisible();
  });

  test('completa una venta con cobro', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Galletas');
    await page.click('text=Galletas Test');

    await page.click('button:has-text("Cobrar Venta")');
    await expect(page.locator('text=Confirmar Pago')).toBeVisible();

    await page.fill('input[placeholder*="Efectivo recibido"]', '50');
    await page.click('button:has-text("Confirmar Pago")');
    await esperarToast(page, 'Venta registrada');
  });

  test('limpia el carrito', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar variante"]', 'Galletas');
    await page.click('text=Galletas Test');

    await page.click('button:has-text("Limpiar carrito")');
    await expect(page.locator('button:has-text("Cobrar Venta")')).not.toBeVisible();
  });

  test('muestra historial de ventas', async ({ page }) => {
    await expect(page.locator('text=Historial de Ventas')).toBeVisible();
  });
});
