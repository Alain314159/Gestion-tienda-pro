#!/usr/bin/env python3
"""
Script ultra robusto para reparar errores de Svelte 5 en Gestion-tienda-pro
Autor: Qwen | Compatible con Termux
"""
import os
import re
import shutil
from pathlib import Path
from datetime import datetime

# Configuración
ROOT = Path(".")
SRC = ROOT / "src"
BACKUP_DIR = ROOT / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# Colores para Termux
class C:
    OK = "\033[92m✓\033[0m"
    ERR = "\033[91m✗\033[0m"
    WARN = "\033[93m⚠\033[0m"
    INFO = "\033[94mℹ\033[0m"
    BOLD = "\033[1m"
    END = "\033[0m"

def log(msg, level="info"):
    prefix = {"info": C.INFO, "ok": C.OK, "err": C.ERR, "warn": C.WARN}.get(level, "")
    print(f"{prefix} {msg}")

def backup():
    """Crea backup de seguridad de la carpeta src/"""
    log(f"Creando backup de seguridad en: {BACKUP_DIR}", "info")
    shutil.copytree(SRC, BACKUP_DIR / "src")
    log("Backup completado", "ok")

def fix_app_svelte():
    """Corrige errores en src/App.svelte"""
    path = SRC / "App.svelte"
    if not path.exists():
        log(f"No se encontró {path}", "err")
        return 0
    
    content = path.read_text(encoding="utf-8")
    original = content
    changes = 0
    
    # 1. Fix: $derived const -> let ... = $derived(...)
    pattern1 = re.compile(r'\$derived\s+const\s+(\w+)\s*=\s*(.+?);', re.MULTILINE)
    def repl1(m):
        nonlocal changes
        changes += 1
        return f"let {m.group(1)} = $derived({m.group(2)});"
    content = pattern1.sub(repl1, content)
    
    # 2. Fix: <svelte:component this={activo.Componente} />
    old_component = '<svelte:component this={activo.Componente} />'
    new_component = '''{@const Activo = activo?.Componente}
    {#if Activo}
      <Activo />
    {/if}'''
    if old_component in content:
        content = content.replace(old_component, new_component)
        changes += 1
    
    if content != original:
        path.write_text(content, encoding="utf-8")
        log(f"App.svelte: {changes} correcciones aplicadas", "ok")
    return changes

def fix_derived_by_glob():
    """Convierte $derived(() => {...}) a $derived.by(() => {...}) en todos los .svelte"""
    total = 0
    pattern = re.compile(r'\$derived\(\s*\([^)]*\)\s*=>\s*\{')
    
    for svelte in SRC.rglob("*.svelte"):
        if svelte.name == "App.svelte":
            continue  # Ya procesado
        
        content = svelte.read_text(encoding="utf-8")
        original = content
        matches = pattern.findall(content)
        
        if matches:
            # Reemplazar cada ocurrencia
            content = pattern.sub(lambda m: m.group(0).replace("$derived(", "$derived.by(", 1), content)
            svelte.write_text(content, encoding="utf-8")
            total += len(matches)
            log(f"{svelte.relative_to(ROOT)}: {len(matches)} $derived → $derived.by", "ok")
    
    return total

def fix_template_calls():
    """
    Identifica variables $derived en el <script> y elimina los () 
    en las llamadas del template HTML.
    """
    total = 0
    script_re = re.compile(r'<script[^>]*>(.*?)</script>', re.DOTALL)
    # Captura: let nombre = $derived(...) o let nombre = $derived.by(...)
    derived_var_re = re.compile(r'let\s+(\w+)\s*=\s*\$derived(?:\.by)?\s*\(')
    
    for svelte in SRC.rglob("*.svelte"):
        content = svelte.read_text(encoding="utf-8")
        original = content
        
        # Extraer script
        script_match = script_re.search(content)
        if not script_match:
            continue
        
        script_content = script_match.group(1)
        html_content = content[:script_match.start()] + content[script_match.end():]
        
        # Encontrar todas las variables derivadas
        derived_vars = set(derived_var_re.findall(script_content))
        
        if not derived_vars:
            continue
        
        # Para cada variable, reemplazar "varname()" por "varname" en el HTML
        for var in derived_vars:
            # Patrón: nombre de variable seguido de () pero NO precedido por punto (método)
            # y NO seguido por = (asignación)
            pattern = re.compile(rf'(?<![.\w]){re.escape(var)}\(\s*\)')
            new_html, count = pattern.subn(var, html_content)
            if count > 0:
                html_content = new_html
                total += count
        
        # Reconstruir archivo
        new_content = content[:script_match.start()] + script_match.group(0) + html_content
        if new_content != original:
            svelte.write_text(new_content, encoding="utf-8")
            log(f"{svelte.relative_to(ROOT)}: corregidas llamadas en template", "ok")
    
    return total

def fix_localstorage_quota():
    """Envuelve localStorage.setItem en try/catch para evitar QuotaExceededError"""
    path = SRC / "modulos" / "utilidades" / "ajustes.svelte"
    if not path.exists():
        return 0
    
    content = path.read_text(encoding="utf-8")
    old = "localStorage.setItem('tp-backup-auto', JSON.stringify(data));"
    new = """try { localStorage.setItem('tp-backup-auto', JSON.stringify(data)); } 
    catch (e) { console.warn('Backup auto falló (almacenamiento lleno):', e); avisar('Backup automático falló', 'wn'); }"""
    
    if old in content:
        content = content.replace(old, new)
        path.write_text(content, encoding="utf-8")
        log("ajustes.svelte: localStorage protegido con try/catch", "ok")
        return 1
    return 0

def main():
    print(f"\n{C.BOLD}🔧 Reparador de Svelte 5 - Gestion-tienda-pro{C.END}\n")
    
    # Verificaciones
    if not SRC.exists():
        log("No se encuentra la carpeta src/. Asegúrate de estar en la raíz del repo.", "err")
        return 1
    
    backup()
    
    print(f"\n{C.BOLD}📝 Aplicando correcciones...{C.END}")
    
    c1 = fix_app_svelte()
    c2 = fix_derived_by_glob()
    c3 = fix_template_calls()
    c4 = fix_localstorage_quota()
    
    total = c1 + c2 + c3 + c4
    
    print(f"\n{C.BOLD}📊 Resumen:{C.END}")
    print(f"  • App.svelte:           {c1} correcciones")
    print(f"  • $derived → $derived.by: {c2} conversiones")
    print(f"  • Template calls:       {c3} llamadas corregidas")
    print(f"  • localStorage fix:     {c4} archivo(s)")
    print(f"  • TOTAL:                {total} cambios aplicados")
    
    if total > 0:
        print(f"\n{C.OK} {C.BOLD}¡Reparación completada!{C.END}")
        print(f"\n💡 {C.BOLD}Siguientes pasos:{C.END}")
        print("   1. Revisa los cambios: git diff")
        print("   2. Prueba en dev: npm run dev")
        print("   3. Si todo funciona: git add . && git commit -m 'fix: corrige errores de sintaxis Svelte 5'")
        print(f"\n🔄 Si algo falla, restaura el backup: rm -rf src && cp -r {BACKUP_DIR}/src .")
    else:
        print(f"\n{C.WARN} No se encontraron errores conocidos. ¡El código ya está limpio!")
    
    return 0

if __name__ == "__main__":
    exit(main())
