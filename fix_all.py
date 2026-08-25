import os

def fix_ajustes():
    path = "src/modulos/utilidades/ajustes.svelte"
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    
    viejo_btn = """      <button class="btn sec sm" on:click={backupAhora}>
        <Icono nombre="save" size={16} /> Hacer backup ahora
      </button>"""
    nuevo_btn = viejo_btn + """
      {#if backupAuto}
        <button class="btn dgr sm" on:click={restaurarBackup}>
          <Icono nombre="refresh" size={16} /> Restaurar backup automático
        </button>
      {/if}"""
    assert viejo_btn in t, "Ancla 1 (ajustes btn) no encontrada"
    t = t.replace(viejo_btn, nuevo_btn, 1)

    fn = """
  async function restaurarBackup() {
    const raw = localStorage.getItem("tp-backup-auto");
    if (!raw) { avisar("No hay backup guardado", "dg"); return; }
    const ok = await confirmar("Restaurar", "Se reemplazan TODOS los datos actuales con el backup automático");
    if (!ok) return;
    const data = JSON.parse(raw);
    const db = getDB();
    for (const [nombre, filas] of Object.entries(data.tablas)) {
      if (db[nombre]) await db[nombre].bulkPut(filas);
    }
    avisar("Backup restaurado", "ok");
    setTimeout(() => location.reload(), 1000);
  }
"""
    assert "onMount(async () => {" in t, "Ancla 2 (ajustes onMount) no encontrada"
    t = t.replace("  onMount(async () => {", fn + "\n  onMount(async () => {", 1)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: ajustes.svelte - restaurar backup añadido")

def fix_ventas():
    path = "src/modulos/negocio/ventas.svelte"
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    viejo = "{#if resultados().length > 0}"
    nuevo = """{#if busqueda.trim()}
      <div class="mut" style="text-align:right;font-size:0.85rem;margin-top:0.25rem">{resultados().length} resultado(s)</div>
    {/if}
    {#if resultados().length > 0}"""
    assert viejo in t, "Ancla (ventas) no encontrada"
    t = t.replace(viejo, nuevo, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: ventas.svelte - contador resultados")

def fix_compras():
    path = "src/modulos/negocio/compras.svelte"
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    viejo = "{#if productosFiltrados().length > 0 && !esNuevo}"
    nuevo = """{#if busqueda.trim() && !esNuevo}
      <div class="mut" style="text-align:right;font-size:0.85rem;margin-top:0.25rem">{productosFiltrados().length} resultado(s)</div>
    {/if}
    {#if productosFiltrados().length > 0 && !esNuevo}"""
    assert viejo in t, "Ancla (compras) no encontrada"
    t = t.replace(viejo, nuevo, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: compras.svelte - contador resultados")

def fix_caja():
    path = "src/modulos/negocio/caja.svelte"
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    viejo = """<div class="mut" style="margin-top:0.5rem;font-size:0.85rem">
      El saldo es acumulativo (incluye todo el historial).
    </div>"""
    nuevo = """<div class="mut" style="margin-top:0.5rem;font-size:0.85rem">
      El saldo de caja es <strong>acumulativo</strong> (incluye todo el historial). El cierre de período solo reinicia los contadores de ventas, compras y ganancia del dashboard.
    </div>"""
    assert viejo in t, "Ancla (caja) no encontrada"
    t = t.replace(viejo, nuevo, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: caja.svelte - texto explicativo")

def fix_patrimonio():
    path = "src/modulos/negocio/patrimonio.svelte"
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    viejo = "let gananciaBrutaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.total) - n(v.ganancia), 0) > 0 ? ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0) + (ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.total), 0) - ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0)) : 0);"
    nuevo = "let gananciaBrutaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));"
    assert viejo in t, "Ancla (patrimonio) no encontrada"
    t = t.replace(viejo, nuevo, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: patrimonio.svelte - cálculo bruta corregido")

if __name__ == '__main__':
    fix_ajustes()
    fix_ventas()
    fix_compras()
    fix_caja()
    fix_patrimonio()
    print("\nTODO LISTO: 5 correcciones aplicadas con éxito.")
