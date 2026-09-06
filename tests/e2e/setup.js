/** Helpers compartidos para tests e2e */

/**
 * Espera a que la app termine de cargar.
 * Usa waitForLoadState en lugar de esperar un texto transitorio
 * que podria no aparecer si la carga es rapida.
 */
async function esperarCarga(page) {
  await page.waitForLoadState('networkidle');
  // Esperamos a que el header o el nav esten visibles (elementos estables)
  await page.locator('h1:has-text("Tienda Pro"), nav').first().waitFor({ state: 'visible', timeout: 15000 });
}

export async function limpiarDB(page) {
  await page.goto('/');
  await esperarCarga(page);
  await page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('gestion-tienda-db');
      req.onsuccess = () => {
        const db = req.result;
        const names = Array.from(db.objectStoreNames);
        const tx = db.transaction(names, 'readwrite');
        for (const n of names) {
          tx.objectStore(n).clear();
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}

export async function seedDB(page, data) {
  await page.evaluate(async (data) => {
    const req = indexedDB.open('gestion-tienda-db');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(Object.keys(data), 'readwrite');
        for (const [table, rows] of Object.entries(data)) {
          if (!db.objectStoreNames.contains(table)) continue;
          const store = tx.objectStore(table);
          for (const row of rows) store.put(row);
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, data);
}

/**
 * Navega a un modulo de la app usando hash routing.
 * Usa URL relativa al baseURL configurado en playwright.config.js.
 */
export async function navegarA(page, ruta) {
  await page.goto('/#' + ruta);
  await esperarCarga(page);
}

/**
 * Espera a que aparezca un toast con texto que contenga la cadena dada.
 * El toast de la app es un div con clase 'fixed bottom-20'.
 */
export async function esperarToast(page, texto) {
  const toast = page.locator('div.fixed.bottom-20').filter({ hasText: new RegExp(texto) });
  await toast.waitFor({ state: 'visible', timeout: 10000 });
}
