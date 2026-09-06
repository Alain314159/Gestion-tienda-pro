/** Helpers compartidos para tests e2e */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4173';

export async function limpiarDB(page) {
  await page.goto(BASE_URL + '/');
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
