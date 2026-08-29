export const n = v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
};

export function fmt(v) {
    const num = n(v);
    if (!isFinite(num)) return '0.00';
    return num.toLocaleString('es', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function fmtCant(v) {
    const x = n(v);
    if (!isFinite(x)) return '0';
    if (Number.isInteger(x)) {
        return String(x);
    }
    return x.toLocaleString('es', { maximumFractionDigits: 3 });
}

export function fmtFecha(t) {
    if (!t) return '—';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export function fmtFH(t) {
    if (!t) return '—';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es', {
        day: '2-digit',
        month: 'short'
    }) + ' ' + d.toLocaleTimeString('es', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function slug(s) {
    if (!s) return 'dato';
    return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'dato';
}
