import { test, expect } from '@playwright/test';
import { limpiarDB, navegarA, esperarToast } from './setup.js';

test.describe('Productos y Variantes', () => {
  test.beforeEach(async ({ page }) => {
    await limpiarDB(page);
    await navegarA(page, 'productos');
  });

  test('crea un producto base', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre del producto"]', 'Detergente Test');
    await page.fill('input[placeholder="Codigo (opcional)"]', 'DET-001');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');
    await expect(page.locator('text=Detergente Test')).toBeVisible();
  });

  test('no permite producto sin nombre', async ({ page }) => {
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Nombre obligatorio');
  });

  test('agrega una variante a un producto', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre del producto"]', 'Jabon Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await page.click('text=Jabon Test');
    await page.click('button[title="Agregar variante"]');

    await page.fill('input[placeholder*="Nombre de variante"]', '500gr');
    await page.fill('input[placeholder="Precio base"]', '25.50');
    await page.fill('input[placeholder="Stock min."]', '10');
    await page.fill('input[placeholder*="Unidad"]', 'u');
    await page.click('button:has-text("Guardar Variante")');

    await esperarToast(page, 'Variante agregada');
  });

  test('duplica una variante existente', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre del producto"]', 'Shampoo Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await page.click('text=Shampoo Test');
    await page.click('button[title="Duplicar variante"]');

    await expect(page.locator('input[placeholder*="Nombre de variante"]')).toHaveValue(/copia/);

    await page.click('button:has-text("Guardar Variante")');
    await esperarToast(page, 'Variante agregada');
  });

  test('edita una variante', async ({ page }) => {
    await page.fill('input[placeholder*="Nombre del producto"]', 'Crema Test');
    await page.click('button:has-text("Guardar Producto")');
    await esperarToast(page, 'Producto agregado');

    await page.click('text=Crema Test');
    await page.click('button[title="Editar variante"]');

    await page.fill('input[placeholder*="Nombre de variante"]', 'Crema Test Editada');
    await page.click('button:has-text("Actualizar Variante")');
    await esperarToast(page, 'Variante actualizada');
  });
});
