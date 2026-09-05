import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Flujo completo: Producto -> Compra -> Venta -> Inventario', () => {
  test('ciclo completo de negocio', async ({ page }) => {
    await limpiarDB(page);

    await navegarA(page, 'productos');
    await page.fill('input[placeholder*="Nombre del producto"]', 'Cereal E2E');
    await page.fill('input[placeholder="Codigo (opcional)"]', 'CER-999');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await page.click('text=Cereal E2E');
    await page.click('button[title="Agregar variante"]');
    await page.fill('input[placeholder*="Nombre de variante"]', 'Caja x12');
    await page.fill('input[placeholder="Precio base"]', '45.00');
    await page.fill('input[placeholder="Stock min."]', '5');
    await page.fill('input[placeholder*="Unidad"]', 'caja');
    await page.click('button:has-text("Guardar Variante")');
    await esperarToast(page, 'Variante agregada');

    await navegarA(page, 'compras');
    await page.fill('input[placeholder*="Buscar producto"]', 'Cereal');
    await page.click('text=Cereal E2E');
    await page.click('text=Caja x12');
    await page.fill('input[placeholder="Cantidad"]', '20');
    await page.fill('input[placeholder="Costo unit."]', '30.00');
    await page.click('button:has-text("Registrar Compra")');
    await esperarToast(page, 'Compra');

    await navegarA(page, 'ventas');
    await page.fill('input[placeholder*="Buscar variante"]', 'Cereal');
    await page.click('text=Cereal E2E');
    await page.click('button:has-text("Cobrar Venta")');
    await page.fill('input[placeholder*="Efectivo recibido"]', '100');
    await page.click('button:has-text("Confirmar Pago")');
    await esperarToast(page, 'Venta registrada');

    await navegarA(page, 'inventario');
    await page.fill('input[placeholder*="Buscar producto"]', 'Cereal');
    await page.click('text=Cereal E2E');
    await page.click('text=Caja x12');
    await page.fill('input[placeholder*="merma / + sobrante"]', '-2');
    await page.selectOption('select', 'merma');
    await page.click('button:has-text("Registrar Ajuste")');
    await esperarToast(page, 'Merma registrada');

    await navegarA(page, 'inicio');
    await expect(page.locator('text=Cereal E2E').first()).toBeVisible();
  });
});
