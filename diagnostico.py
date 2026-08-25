import re

path = "src/modulos/negocio/patrimonio.svelte"

try:
    with open(path, 'r', encoding='utf-8') as f:
        t = f.read()
    print(f"✓ Archivo leído: {len(t)} bytes")
except Exception as e:
    print(f"✗ Error al leer archivo: {e}")
    exit(1)

# Buscar cualquier línea que contenga gananciaBrutaPeriodo
match = re.search(r"let gananciaBrutaPeriodo[^;]+;", t)
if match:
    print("\n✓ Línea encontrada:")
    print(match.group())
    print("\nIntentando corrección...")
    
    # Reemplazar toda la línea
    t_corregido = re.sub(
        r"let gananciaBrutaPeriodo[^;]+;",
        "let gananciaBrutaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));",
        t,
        count=1
    )
    
    if t_corregido != t:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(t_corregido)
        print("✓ Archivo corregido y guardado")
    else:
        print("✗ No se pudo reemplazar la línea")
else:
    print("✗ No se encontró ninguna línea con gananciaBrutaPeriodo")
    # Buscar líneas similares
    lineas = [l for l in t.split('\n') if 'ganancia' in l.lower() and 'derived' in l]
    if lineas:
        print("\nLíneas similares encontradas:")
        for l in lineas[:3]:
            print(f"  {l.strip()}")
