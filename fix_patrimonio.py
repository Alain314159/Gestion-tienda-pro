import re

path = "src/modulos/negocio/patrimonio.svelte"
with open(path, 'r', encoding='utf-8') as f:
    t = f.read()

# Usamos regex para encontrar la línea sin importar espacios o saltos de línea internos
patron = r"let gananciaBrutaPeriodo\s*=\s*\$derived\([^;]+;\n"
nuevo = "let gananciaBrutaPeriodo = $derived(() => ventas.filter(v => v.estado === 'activa' && n(v.fecha) >= periodoInicio()).reduce((a, v) => a + n(v.ganancia), 0));\n"

if re.search(patron, t):
    t = re.sub(patron, nuevo, t, count=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(t)
    print("OK: patrimonio.svelte - cálculo bruta corregido con regex")
else:
    print("AVISO: La línea de gananciaBrutaPeriodo ya parece estar correcta o tiene otro formato. No se modificó.")
    # Mostramos las primeras 100 letras de lo que encuentra para depurar si es necesario
    match = re.search(r"let gananciaBrutaPeriodo[^;]+;", t)
    if match:
        print("Encontrado:", match.group()[:80], "...")
