/** Helpers compartidos para tests e2e */

export async function limpiarDB(page) {
  await page.evaluate(async () => {
    const dbName = 'tienda-pro-v9';
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function esperarToast(page, texto) {
  await page.waitForSelector(`text=${texto}`, { timeout: 8000 });
}

export async function navegarA(page, modulo) {
  await page.goto(`/#${modulo}`);
  await page.waitForSelector('text=Cargando Tienda Pro...', { state: 'detached', timeout: 15000 });
}
