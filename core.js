// ================================================================
// CORE.JS - Cerebro de Tienda Pro (Fase 2)
// Vue 3 + toda la lógica de Fase 1 portada + features del spec:
// - Roles admin/cajero
// - Variantes de producto
// - Notas en venta
// - Tema color personalizable
// - Bitácora
// - Modo offline con toast
// - Detección de carga de librerías
// ================================================================

// === Iconos SVG (paths) ===
const PATHS = {
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  bag:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  package:'<path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y1="12"/>',
  tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  wallet:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  chart:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  trend:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit:'<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  alert:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  chevron:'<polyline points="6 9 12 15 18 9"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  diamond:'<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  store:'<path d="M2 7l1.5-4h17L22 7"/><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><path d="M2 7h20"/><path d="M9 21v-6h6v6"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
};
window.PATHS = PATHS;

// === Verificación de librerías (Punto final del doc) ===
function checkLibs() {
  const errs = [];
  if (typeof Vue === 'undefined') errs.push('Vue');
  if (typeof Dexie === 'undefined') errs.push('Dexie');
  if (typeof window.supabase === 'undefined') errs.push('Supabase');
  return errs;
}

const { h } = Vue;
const app = Vue.createApp({
  data() {
    return {
      // Estado
      cargando: true,
      errorLibs: [],
      sec: 'dashboard',
      masAbierto: false,
      ajustesAbierto: false,
      empModalAbierto: false,
      online: navigator.onLine,
      hayUpdate: false,
      procesandoVenta: false,

      // Datos (cargados en RAM al iniciar sesión - Punto 49)
      productos: [], variantes: [], lotes: [], ventas: [], compras: [],
      ajustes: [], arqueos: [], movCaja: [], cierres: [], capital: [],
      retiros: [], gastos: [], empleados: [],

      // Config
      cfg: { tema:'light', colorPri:'azul', moneda:'$', nombre:'Tienda Pro', pinActivo:false, pin:'', periodoInicio:new Date().toISOString(), capitalInicial:0, ultimoExport:null, quickActions:['ventas','compras','caja','inventario'] },

      // Carrito (persistido)
      carrito: JSON.parse(localStorage.getItem('carritoPro') || '[]'),
      carritoNota: '',

      // Búsquedas
      busqVenta:'', busqCompra:'', busqHist:'', busqProd:'',
      mostrarArchivados:false, focusVenta:false, focusCompra:false,

      // Forms
      prodForm: { editId:'', nombre:'', codigo:'', precio:'', stockMin:'5', unidad:'' },
      compraForm: { editId:'', productoId:'', nombre:'', cantidad:'', costo:'', unidad:'' },
      ajusteForm: { productoId:'', cantidad:'', motivo:'', costoSobrante:'' },
      arqueoForm: { monto:'', nota:'' },
      retiroForm: { monto:'', concepto:'' },
      aporteForm: { monto:'', nota:'' },
      capInicialStr:'',
      empForm: { username:'', password:'', rol:'cajero' },

      // Reporte
      rep: { fechaInicio:'', fechaFin:'', resultado:null },

      // Expandidos
      invExpandido:{}, prodExpandido:{}, varianteEditando:null,

      // Modales
      cobroModal: { activo:false, total:0, recibido:'', vuelto:0 },
      confirm: { activo:false, titulo:'', msg:'', onOk:null },
      prompt: { activo:false, titulo:'', msg:'', placeholder:'', type:'text', value:'', onOk:null },

      // UI
      toast: { show:false, msg:'', type:'ok', accionTxt:'', accionFn:null, timer:null },
      importFile: null,
      ultimoBackup: null,
      chartInst: null,
      swWaiting: null,
      aplicandoSw: false,
      sesionIniciada: false,

      // Login
      esRegistro: false,
      mostrarPassword: false,
      loginForm: { email:'', password:'', nombreTienda:'' }
    };
  },
  computed: {
    esAdmin() { return Auth.perfil && Auth.perfil.rol === 'admin'; },
    esCajero() { return Auth.perfil && Auth.perfil.rol === 'cajero'; },
    tiendaId() { return Auth.perfil?.tienda_id; },
    mutColor() { return this.cfg.tema === 'dark' ? '#94a3b8' : '#6b7280'; },
    txtColor() { return this.cfg.tema === 'dark' ? '#f1f5f9' : '#111827'; },
    prodsActivos() { return this.productos.filter(p => !p.archivado); },
    stockMap() {
      const map = {};
      this.lotes.forEach(l => { const d = Math.max(0, n(l.cantidadInicial) - n(l.cantidadVendida)); map[l.productoId] = (map[l.productoId] || 0) + d; });
      return map;
    },
    prodsFiltrados() {
      let p = this.mostrarArchivados ? this.productos : this.prodsActivos;
      const q = this.busqProd.toLowerCase().trim();
      if (!q) return p;
      return p.filter(x => x.nombre.toLowerCase().includes(q) || (x.codigo || '').toLowerCase().includes(q));
    },
    listaVenta() {
      const q = this.busqVenta.toLowerCase().trim();
      const base = q ? this.prodsActivos.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)) : this.prodsActivos;
      return base.filter(p => this.stock(p.id) > 0).slice(0, 12);
    },
    listaCompra() {
      const q = this.busqCompra.toLowerCase().trim();
      const base = q ? this.prodsActivos.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)) : this.prodsActivos;
      return base.slice(0, 12);
    },
    ventasFiltradas() {
      let v = this.ventas.slice().sort((a, b) => { if (a.anulada !== b.anulada) return a.anulada ? 1 : -1; return new Date(b.fecha) - new Date(a.fecha); });
      const q = this.busqHist.toLowerCase().trim();
      if (q) v = v.filter(x => x.items.some(i => i.nombre.toLowerCase().includes(q)));
      return v.slice(0, 100);
    },
    comprasOrdenadas() { return this.compras.filter(c => !c.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 100); },
    totalCarrito() { return m(this.carrito.reduce((s, it) => s + (n(it.precio) * n(it.cant)), 0)); },
    gananciaCarrito() {
      return m(this.carrito.reduce((s, it) => {
        const f = this.calcFIFO(it.productoId, n(it.cant));
        if (f.error) return s;
        return s + ((n(it.precio) * n(it.cant)) - f.costoTotal);
      }, 0));
    },
    ventasPeriodoArr() { const i = new Date(this.cfg.periodoInicio); return this.ventas.filter(v => !v.anulada && new Date(v.fecha) >= i); },
    comprasPeriodoArr() { const i = new Date(this.cfg.periodoInicio); return this.compras.filter(c => !c.anulada && new Date(c.fecha) >= i); },
    ventasPeriodo() { return m(this.ventasPeriodoArr.reduce((s, v) => s + n(v.total), 0)); },
    comprasPeriodo() { return m(this.comprasPeriodoArr.reduce((s, c) => s + n(c.total), 0)); },
    gananciaBrutaPeriodo() { return m(this.ventasPeriodoArr.reduce((s, v) => s + n(v.ganancia), 0)); },
    gastosOpPeriodo() {
      const i = new Date(this.cfg.periodoInicio);
      return m(this.gastos.filter(g => new Date(g.fecha) >= i).reduce((s, g) => s + n(g.monto), 0));
    },
    gananciaNetaPeriodo() { return m(this.gananciaBrutaPeriodo - this.gastosOpPeriodo); },
    margenPeriodo() { return this.ventasPeriodo > 0 ? ((this.gananciaNetaPeriodo / this.ventasPeriodo) * 100).toFixed(1) : '0.0'; },
    aportesTotal() { return m(this.capital.reduce((s, c) => s + n(c.monto), 0)); },
    capitalTotal() { return m(n(this.cfg.capitalInicial) + this.aportesTotal); },
    ventasContadoTotal() { return m(this.ventas.filter(v => !v.anulada).reduce((s, v) => s + n(v.total), 0)); },
    comprasTotal() { return m(this.compras.filter(c => !c.anulada).reduce((s, c) => s + n(c.total), 0)); },
    retirosTotal() { return m(this.retiros.reduce((s, r) => s + n(r.monto), 0)); },
    arqueoNeto() { return m(this.movCaja.filter(mv => mv.concepto && mv.concepto.toLowerCase().includes('arqueo')).reduce((s, mv) => mv.tipo === 'ingreso' ? s + n(mv.monto) : s - n(mv.monto), 0)); },
    saldoCaja() { return m(n(this.cfg.capitalInicial) + this.aportesTotal + this.ventasContadoTotal - this.comprasTotal - this.retirosTotal + this.arqueoNeto); },
    gananciasAcumuladas() {
      const c = this.cierres.reduce((s, x) => s + n(x.ganancia), 0);
      return m(c + this.gananciaNetaPeriodo - this.retirosTotal);
    },
    gananciaDisponible() {
      const acum = this.gananciasAcumuladas;
      if (acum <= 0) return 0;
      const capitalEnCaja = Math.max(0, this.capitalTotal - this.valorInventario);
      const efectivoLibre = Math.max(0, this.saldoCaja - capitalEnCaja);
      return Math.max(0, Math.min(acum, efectivoLibre));
    },
    patrimonioTotal() { return m(this.capitalTotal + this.gananciasAcumuladas); },
    lotesActivos() { return this.lotes.filter(l => (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1)); },
    valorInventario() { return m(this.lotesActivos.reduce((s, l) => s + ((n(l.cantidadInicial) - n(l.cantidadVendida)) * n(l.costo)), 0)); },
    unidadesTotal() { return this.lotesActivos.reduce((s, l) => s + (n(l.cantidadInicial) - n(l.cantidadVendida)), 0); },
    inventarioGrupos() {
      const map = {};
      this.lotesActivos.forEach(l => {
        if (!map[l.productoId]) map[l.productoId] = { productoId:l.productoId, nombre:l.productoNombre, unidad:l.productoUnidad||'', lotes:[], stockTotal:0, valorTotal:0 };
        const d = n(l.cantidadInicial) - n(l.cantidadVendida);
        map[l.productoId].lotes.push(l);
        map[l.productoId].stockTotal += d;
        map[l.productoId].valorTotal = m(map[l.productoId].valorTotal + (d * n(l.costo)));
      });
      return Object.values(map).sort((a, b) => b.valorTotal - a.valorTotal);
    },
    productosBajoStock() { return this.prodsActivos.filter(p => { const s = this.stock(p.id); return s > 0 && s <= n(p.stockMinimo); }); },
    productosAgotados() { return this.prodsActivos.filter(p => this.stock(p.id) === 0); },
    ajustesRecientes() { return this.ajustes.slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20); },
    arqueoPreview() {
      if (this.arqueoForm.monto === '' || this.arqueoForm.monto === null) return null;
      const monto = n(this.arqueoForm.monto);
      const sys = this.saldoCaja;
      const diff = monto - sys;
      const tipo = Math.abs(diff) < 0.01 ? 'cuadre' : (diff > 0 ? 'sobrante' : 'faltante');
      return { fisico:monto, sistema:sys, diff:Math.abs(diff), tipo };
    },
    movimientosCaja() {
      const arr = [];
      if (n(this.cfg.capitalInicial) > 0) arr.push({ id:'ci', fecha:this.cfg.periodoInicio, tipo:'ingreso', monto:this.cfg.capitalInicial, concepto:'Capital inicial' });
      this.capital.forEach(c => arr.push({ id:c.id, fecha:c.fecha, tipo:'ingreso', monto:c.monto, concepto:'Aporte'+(c.nota?' · '+c.nota:'') }));
      this.ventas.filter(v => !v.anulada).forEach(v => arr.push({ id:v.id, fecha:v.fecha, tipo:'ingreso', monto:v.total, concepto:'Venta' }));
      this.compras.filter(c => !c.anulada).forEach(c => arr.push({ id:c.id, fecha:c.fecha, tipo:'egreso', monto:c.total, concepto:'Compra · '+c.productoNombre }));
      this.retiros.forEach(r => arr.push({ id:r.id, fecha:r.fecha, tipo:'egreso', monto:r.monto, concepto:'Retiro · '+r.concepto }));
      this.movCaja.forEach(x => arr.push({ id:x.id, fecha:x.fecha, tipo:x.tipo, monto:x.monto, concepto:x.concepto }));
      return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 30);
    },
    cierresOrdenados() { return this.cierres.slice().sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre)).slice(0, 10); },
    topRentables() {
      const now = new Date(), mes = now.getMonth(), an = now.getFullYear();
      const r = {};
      this.ventas.filter(v => !v.anulada).forEach(v => {
        const f = new Date(v.fecha);
        if (f.getMonth() === mes && f.getFullYear() === an) v.items.forEach(it => {
          if (!r[it.productoId]) r[it.productoId] = { id:it.productoId, nombre:it.nombre, gan:0 };
          r[it.productoId].gan = m(r[it.productoId].gan + n(it.ganancia));
        });
      });
      return Object.values(r).sort((a, b) => b.gan - a.gan).slice(0, 5);
    },
    ultimaActividad() {
      const v = this.ventas.filter(x => !x.anulada).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
      const c = this.cierresOrdenados[0];
      if (!v && !c) return 'Sin actividad';
      if (v && (!c || new Date(v.fecha) > new Date(c.fechaCierre))) return 'Venta ' + this.fmt(v.total) + ' el ' + this.fmtFH(v.fecha);
      return 'Cierre ' + c.periodo;
    }
  },
  methods: {
    // === Helpers UI ===
    navColor(active) { return active ? '#2196F3' : this.mutColor; },
    fmt(val) { const v = n(val); return (this.cfg.moneda || '$') + v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }); },
    fmtCant(val, forceDecimals=false) {
      const v = n(val);
      if (Number.isInteger(v) && !forceDecimals) return v.toString();
      return v.toFixed(3).replace(/\.?0+$/, '');
    },
    fmtFecha(iso) { try { const d = new Date(iso); return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getFullYear()).slice(2); } catch (e) { return ''; } },
    fmtFH(iso) { try { const d = new Date(iso); return this.fmtFecha(iso) + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); } catch (e) { return ''; } },

    // === Toast ===
    toastMsg(msg, type='ok', accionTxt='', accionFn=null) {
      clearTimeout(this.toast.timer);
      this.toast = { show:true, msg, type, accionTxt, accionFn, timer:null };
      vib(type === 'ok' ? 20 : 40);
      this.toast.timer = setTimeout(() => { this.toast.show = false; }, accionTxt ? 5000 : 3000);
    },

    // === Tema ===
    toggleTema() {
      this.cfg.tema = this.cfg.tema === 'dark' ? 'light' : 'dark';
      this.aplicarTema();
      this.guardarCfg();
      if (this.sec === 'dashboard') this.$nextTick(() => requestAnimationFrame(() => this.renderChart()));
    },
    aplicarTema() {
      try { document.documentElement.setAttribute('data-theme', this.cfg.tema); } catch (e) {}
      try { document.documentElement.setAttribute('data-pri', this.cfg.colorPri || 'azul'); } catch (e) {}
    },
    setColor(c) { this.cfg.colorPri = c; this.aplicarTema(); this.guardarCfg(); },

    // === Navegación ===
    ir(s) { this.masAbierto = false; this.sec = s; try { history.pushState({ sec:s }, '', '#' + s); } catch (e) {} },

    // === Stock / Lotes ===
    stock(pid) { return this.stockMap[pid] || 0; },
    badgeStock(p) { const s = this.stock(p.id); if (p.archivado) return 'arch'; if (s === 0) return 'out'; if (s <= n(p.stockMinimo)) return 'low'; return 'ok'; },
    txtBadge(p) { const s = this.stock(p.id); if (p.archivado) return 'ARCHIVADO'; if (s === 0) return 'AGOTADO'; if (s <= n(p.stockMinimo)) return 'BAJO'; return 'OK'; },
    lotesDeProducto(pid) { return this.lotes.filter(l => l.productoId === pid && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1)); },
    variantesDeProducto(pid) { return this.variantes.filter(v => v.producto_id === pid); },
    valorLotesProducto(pid) { return m(this.lotesDeProducto(pid).reduce((s, l) => s + ((n(l.cantidadInicial) - n(l.cantidadVendida)) * n(l.costo)), 0)); },
    calcFIFO(pid, cant) {
      const lotes = this.lotes.filter(l => l.productoId === pid && (n(l.cantidadInicial) - n(l.cantidadVendida)) > 0).sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || (a.id < b.id ? -1 : 1));
      let rest = cant, total = 0, usados = [];
      for (const l of lotes) {
        if (rest <= 0) break;
        const disp = n(l.cantidadInicial) - n(l.cantidadVendida);
        const usar = Math.min(disp, rest);
        total = m(total + (usar * n(l.costo)));
        usados.push({ loteId:l.id, cantidad:usar, costo:l.costo });
        rest -= usar;
      }
      if (rest > 0.001) return { error:'Stock insuficiente (faltan ' + rest.toFixed(3) + ')' };
      return { costoTotal: total, usados };
    },

    // === Carrito ===
    agregarCarrito(p) {
      const s = this.stock(p.id);
      if (s <= 0) return this.toastMsg('Sin stock', 'bad');
      const ex = this.carrito.find(i => i.productoId === p.id);
      if (ex) {
        if (n(ex.cant) < s) ex.cant = String(n(ex.cant) + 1);
        else return this.toastMsg('Stock máximo', 'warn');
      } else {
        this.carrito.push({ productoId:p.id, nombre:p.nombre, precio:String(p.precio), cant:'1', unidad:p.unidad||'' });
      }
      this.busqVenta = '';
      this.focusVenta = false;
    },
    agregarPrimero() { if (this.listaVenta.length > 0) this.agregarCarrito(this.listaVenta[0]); },
    cambiarCant(it, dir) {
      let val = n(it.cant) + dir;
      if (it.unidad && ['kg','lb','gr','litro','m'].includes(it.unidad)) val = n(it.cant) + (dir * 0.5);
      if (val > this.stock(it.productoId)) return this.toastMsg('Stock máximo alcanzado', 'warn');
      if (val < 0) val = 0;
      it.cant = String(val);
    },
    validarCant(it) {
      let val = n(it.cant);
      if (val > this.stock(it.productoId)) { val = this.stock(it.productoId); this.toastMsg('Cantidad ajustada al stock disponible', 'warn'); }
      if (val < 0) val = 0;
      it.cant = String(val);
    },
    validarPrecio(it) { it.precio = String(n(it.precio)); },
    subTotalItem(it) { return m(n(it.precio) * n(it.cant)); },
    iniciarCobro() {
      const inv = this.carrito.filter(it => n(it.cant) <= 0);
      if (inv.length) return this.toastMsg('Todas las cantidades deben ser > 0', 'bad');
      this.cobroModal.total = this.totalCarrito;
      this.cobroModal.recibido = '';
      this.cobroModal.vuelto = 0;
      this.cobroModal.activo = true;
    },
    calcVuelto() {
      const rec = n(this.cobroModal.recibido);
      this.cobroModal.vuelto = rec > 0 ? m(rec - this.cobroModal.total) : 0;
    },
    async procesarVenta() {
      this.procesandoVenta = true;
      try {
        const items = []; let tot = 0, gan = 0, todos = [];
        for (const it of this.carrito) {
          const c = n(it.cant), pr = n(it.precio);
          const f = this.calcFIFO(it.productoId, c);
          if (f.error) throw new Error(f.error + ' en ' + it.nombre);
          const sub = pr * c;
          items.push({ productoId:it.productoId, nombre:it.nombre, cantidad:c, unidad:it.unidad||'', precio:pr, costo:f.costoTotal, ganancia:m(sub - f.costoTotal), lotesUsados:f.usados });
          tot = m(tot + sub);
          gan = m(gan + (sub - f.costoTotal));
          todos.push(...f.usados);
        }
        const venta = {
          id: genId('v'),
          tienda_id: this.tiendaId,
          fecha: new Date().toISOString(),
          items,
          total: tot,
          ganancia: gan,
          nota: this.carritoNota || '',
          anulada: false,
          sync_flag: 0,
          updated_at: new Date().toISOString()
        };

        // Transacción atómica: venta + actualización de lotes
        await db.transaction('rw', db.ventas, db.lotes, async () => {
          await P(db.ventas, venta);
          const lotesActualizados = [];
          for (const u of todos) {
            const l = this.lotes.find(x => x.id === u.loteId);
            if (l) {
              l.cantidadVendida = q(n(l.cantidadVendida) + u.cantidad);
              l.sync_flag = 0;
              l.updated_at = new Date().toISOString();
              lotesActualizados.push(l);
            }
          }
          if (lotesActualizados.length > 0) await db.lotes.bulkPut(lotesActualizados.map(l => clean(l)));
        });

        await this.recargar(['ventas', 'lotes']);
        this.carrito = [];
        this.carritoNota = '';
        localStorage.removeItem('carritoPro');
        this.cobroModal.activo = false;
        this.toastMsg('Venta exitosa: ' + this.fmt(tot));
        await bitacora('venta', { id: venta.id, total: tot, items: items.length });
        SyncEngine.pushChanges();
      } catch (e) {
        this.toastMsg(e.message, 'bad');
      } finally {
        this.procesandoVenta = false;
      }
    },

    // === Anular venta ===
    anularVenta(id) {
      if (!this.esAdmin) return this.toastMsg('Solo el admin puede anular ventas', 'bad');
      const v = this.ventas.find(x => x.id === id);
      if (!v) return;
      this.pedirPin(() => {
        this.confirm = { activo:true, titulo:'Anular venta', msg:'¿Anular venta por ' + this.fmt(v.total) + '? Se restaura el stock y se descuenta de caja.', onOk:async () => {
          try {
            await db.transaction('rw', db.ventas, db.lotes, async () => {
              await P(db.ventas, Object.assign({}, v, { anulada:true, fechaAnulacion:new Date().toISOString(), sync_flag:0, updated_at:new Date().toISOString() }));
              const lotesActualizados = [];
              for (const it of v.items) {
                if (!it.lotesUsados) continue;
                for (const u of it.lotesUsados) {
                  const l = this.lotes.find(x => x.id === u.loteId);
                  if (l) {
                    l.cantidadVendida = Math.max(0, q(n(l.cantidadVendida) - u.cantidad));
                    l.sync_flag = 0;
                    l.updated_at = new Date().toISOString();
                    lotesActualizados.push(l);
                  }
                }
              }
              if (lotesActualizados.length > 0) await db.lotes.bulkPut(lotesActualizados.map(l => clean(l)));
            });
            await this.recargar(['ventas', 'lotes']);
            this.toastMsg('Venta anulada');
            await bitacora('anular_venta', { id: v.id, total: v.total });
            SyncEngine.pushChanges();
          } catch (e) { this.toastMsg(e.message, 'bad'); }
        }};
      });
    },

    // === Compras ===
    selCompra(p) { this.compraForm = { editId:'', productoId:p.id, nombre:p.nombre, cantidad:'', costo:'', unidad:p.unidad||'' }; this.busqCompra = ''; this.focusCompra = false; },
    resetCompra() { this.compraForm = { editId:'', productoId:'', nombre:'', cantidad:'', costo:'', unidad:'' }; },
    loteSinVentas(cid) { const l = this.lotes.find(x => x.compraId === cid); return l ? n(l.cantidadVendida) === 0 : true; },
    editarCompra(id) { const c = this.compras.find(x => x.id === id); if (!c || !this.loteSinVentas(id)) return; this.compraForm = { editId:id, productoId:c.productoId, nombre:c.productoNombre, cantidad:String(c.cantidad), costo:String(c.costo), unidad:c.unidad||'' }; window.scrollTo(0, 0); },
    eliminarCompra(id) {
      if (!this.loteSinVentas(id)) return;
      const c = this.compras.find(x => x.id === id);
      this.confirm = { activo:true, titulo:'Eliminar compra', msg:'¿Eliminar compra de ' + c.productoNombre + '?', onOk:async () => {
        const l = this.lotes.find(x => x.compraId === id);
        await db.transaction('rw', db.compras, db.lotes, async () => {
          await db.compras.delete(id);
          if (l) await db.lotes.delete(l.id);
        });
        await this.recargar(['compras', 'lotes']);
        this.toastMsg('Compra eliminada');
        SyncEngine.pushChanges();
      }};
    },
    async guardarCompra() {
      const f = this.compraForm;
      const cant = n(f.cantidad), costo = n(f.costo);
      if (!f.productoId) return this.toastMsg('Selecciona producto', 'bad');
      if (cant <= 0) return this.toastMsg('Cantidad debe ser > 0', 'bad');
      if (costo < 0) return this.toastMsg('Costo inválido', 'bad');
      const total = m(cant * costo);
      const ejecutar = async () => {
        try {
          if (f.editId) {
            const l = this.lotes.find(x => x.compraId === f.editId);
            if (l && n(l.cantidadVendida) > 0) return this.toastMsg('Lote con ventas: no editable', 'bad');
            const c = this.compras.find(x => x.id === f.editId);
            await db.transaction('rw', db.compras, db.lotes, async () => {
              await P(db.compras, Object.assign({}, c, { productoId:f.productoId, productoNombre:f.nombre, productoUnidad:f.unidad, cantidad:cant, costo:costo, total, unidad:f.unidad, sync_flag:0, updated_at:new Date().toISOString() }));
              if (l) await P(db.lotes, Object.assign({}, l, { productoId:f.productoId, productoNombre:f.nombre, productoUnidad:f.unidad, cantidadInicial:cant, costo:costo, sync_flag:0, updated_at:new Date().toISOString() }));
            });
          } else {
            const compra = { id:genId('c'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), productoId:f.productoId, productoNombre:f.nombre, productoUnidad:f.unidad, cantidad:cant, costo:costo, total, anulada:false, unidad:f.unidad, sync_flag:0, updated_at:new Date().toISOString() };
            const lote = { id:genId('l'), tienda_id:this.tiendaId, compraId:compra.id, productoId:f.productoId, productoNombre:f.nombre, productoUnidad:f.unidad, cantidadInicial:cant, cantidadVendida:0, costo:costo, fecha:compra.fecha, sync_flag:0, updated_at:new Date().toISOString() };
            await db.transaction('rw', db.compras, db.lotes, async () => {
              await P(db.compras, compra);
              await P(db.lotes, lote);
            });
          }
          await this.recargar(['compras', 'lotes']);
          this.resetCompra();
          this.toastMsg('Compra ' + this.fmt(total));
          await bitacora('compra', { productoId: f.productoId, total });
          SyncEngine.pushChanges();
        } catch (e) { this.toastMsg(e.message, 'bad'); }
      };
      if (!f.editId && total > this.saldoCaja) this.confirm = { activo:true, titulo:'Caja insuficiente', msg:'Cuesta ' + this.fmt(total) + ' pero hay ' + this.fmt(this.saldoCaja) + ' en caja. ¿Continuar?', onOk:ejecutar };
      else ejecutar();
    },

    // === Productos ===
    resetProd() { this.prodForm = { editId:'', nombre:'', codigo:'', precio:'', stockMin:'5', unidad:'' }; this.varianteEditando = null; },
    agregarVariante() {
      if (!this.prodForm.editId) return this.toastMsg('Guarda el producto primero', 'warn');
      this.varianteEditando = { id:'', nombre:'', codigo:'', precio:this.prodForm.precio };
    },
    async guardarVariante() {
      if (!this.varianteEditando) return;
      const v = this.varianteEditando;
      if (!v.nombre) return this.toastMsg('Nombre de variante obligatorio', 'bad');
      const reg = {
        id: v.id || genId('va'),
        tienda_id: this.tiendaId,
        producto_id: this.prodForm.editId,
        nombre: v.nombre,
        codigo: v.codigo || '',
        precio: n(v.precio),
        sync_flag: 0,
        updated_at: new Date().toISOString()
      };
      await P(db.variantes, reg);
      await this.recargar(['variantes']);
      this.varianteEditando = null;
      this.toastMsg('Variante guardada');
      SyncEngine.pushChanges();
    },
    async eliminarVariante(id) {
      this.confirm = { activo:true, titulo:'Eliminar variante', msg:'¿Eliminar esta variante?', onOk:async () => {
        await db.variantes.delete(id);
        await this.recargar(['variantes']);
        this.toastMsg('Variante eliminada');
        SyncEngine.pushChanges();
      }};
    },
    async guardarProducto() {
      const p = this.prodForm;
      const nombre = (p.nombre || '').trim();
      const precio = n(p.precio);
      const min = n(p.stockMin);
      const unidad = (p.unidad || '').trim();
      if (!nombre) return this.toastMsg('Nombre obligatorio', 'bad');
      if (precio <= 0) return this.toastMsg('Precio debe ser > 0', 'bad');
      const dup = this.productos.find(x => x.nombre.toLowerCase() === nombre.toLowerCase() && x.id !== p.editId && !x.archivado);
      if (dup) return this.toastMsg('Ya existe ese nombre', 'bad');
      if (p.editId) {
        const o = this.productos.find(x => x.id === p.editId);
        await P(db.productos, Object.assign({}, o, { nombre, codigo:(p.codigo||'').trim(), precio, stockMinimo:min, unidad, sync_flag:0, updated_at:new Date().toISOString() }));
        this.toastMsg('Producto actualizado');
      } else {
        await P(db.productos, { id:genId('p'), tienda_id:this.tiendaId, nombre, codigo:(p.codigo||'').trim(), precio, stockMinimo:min, archivado:false, unidad, sync_flag:0, updated_at:new Date().toISOString() });
        this.toastMsg('Producto agregado');
      }
      this.resetProd();
      await this.recargar(['productos']);
      await bitacora('producto_guardado', { nombre });
      SyncEngine.pushChanges();
    },
    editarProducto(id) { const p = this.productos.find(x => x.id === id); if (!p) return; this.prodForm = { editId:id, nombre:p.nombre, codigo:p.codigo || '', precio:String(p.precio), stockMin:String(p.stockMinimo || 5), unidad:p.unidad||'' }; window.scrollTo(0, 0); },
    archivarProducto(id) {
      const p = this.productos.find(x => x.id === id);
      if (this.stock(id) > 0) return this.toastMsg('No archivar con stock > 0', 'bad');
      this.confirm = { activo:true, titulo:'Archivar producto', msg:'¿Archivar "' + p.nombre + '"?', onOk:async () => {
        await P(db.productos, Object.assign({}, p, { archivado:true, sync_flag:0, updated_at:new Date().toISOString() }));
        await this.recargar(['productos']);
        this.toastMsg('Archivado');
        await bitacora('producto_archivado', { id, nombre: p.nombre });
        SyncEngine.pushChanges();
      }};
    },
    async restaurarProducto(id) {
      const p = this.productos.find(x => x.id === id);
      await P(db.productos, Object.assign({}, p, { archivado:false, sync_flag:0, updated_at:new Date().toISOString() }));
      await this.recargar(['productos']);
      this.toastMsg('Restaurado');
      SyncEngine.pushChanges();
    },

    // === Ajustes de inventario (mermas/sobrantes) ===
    async registrarAjuste() {
      const f = this.ajusteForm;
      const cant = n(f.cantidad);
      if (!f.productoId) return this.toastMsg('Selecciona producto', 'bad');
      if (cant === 0) return this.toastMsg('Cantidad no puede ser 0', 'bad');
      if (!f.motivo) return this.toastMsg('Selecciona motivo', 'bad');
      const prod = this.productos.find(p => p.id === f.productoId);
      if (cant < 0 && Math.abs(cant) > this.stock(f.productoId)) return this.toastMsg('Solo hay ' + this.stock(f.productoId), 'bad');
      if (cant < 0) {
        const res = this.calcFIFO(f.productoId, Math.abs(cant));
        if (res.error) return this.toastMsg(res.error, 'bad');
        const aj = { id:genId('a'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), productoId:f.productoId, productoNombre:prod.nombre, cantidad:cant, motivo:f.motivo, costoPerdida:res.costoTotal, lotesUsados:res.usados, sync_flag:0, updated_at:new Date().toISOString() };
        await db.transaction('rw', db.ajustes, db.lotes, async () => {
          await P(db.ajustes, aj);
          const lotesActualizados = [];
          for (const u of res.usados) {
            const l = this.lotes.find(x => x.id === u.loteId);
            if (l) { l.cantidadVendida = q(n(l.cantidadVendida) + u.cantidad); l.sync_flag = 0; l.updated_at = new Date().toISOString(); lotesActualizados.push(l); }
          }
          if (lotesActualizados.length > 0) await db.lotes.bulkPut(lotesActualizados.map(l => clean(l)));
        });
        await this.recargar(['ajustes', 'lotes']);
        this.toastMsg('Merma registrada · pérdida ' + this.fmt(res.costoTotal));
      } else {
        const cs = n(f.costoSobrante);
        if (cs < 0) return this.toastMsg('Costo inválido', 'bad');
        const aj = { id:genId('a'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), productoId:f.productoId, productoNombre:prod.nombre, cantidad:cant, motivo:f.motivo, costoPerdida:0, sync_flag:0, updated_at:new Date().toISOString() };
        const lote = { id:genId('l'), tienda_id:this.tiendaId, compraId:'aj-' + aj.id, productoId:f.productoId, productoNombre:prod.nombre, productoUnidad:prod.unidad||'', cantidadInicial:cant, cantidadVendida:0, costo:cs, fecha:aj.fecha, sync_flag:0, updated_at:new Date().toISOString() };
        await db.transaction('rw', db.ajustes, db.lotes, async () => {
          await P(db.ajustes, aj);
          await P(db.lotes, lote);
        });
        await this.recargar(['ajustes', 'lotes']);
        this.toastMsg('Sobrante registrado');
      }
      this.ajusteForm = { productoId:'', cantidad:'', motivo:'', costoSobrante:'' };
      await bitacora('ajuste_inventario', { productoId: f.productoId, cant, motivo: f.motivo });
      SyncEngine.pushChanges();
    },

    // === Caja / Arqueos / Patrimonio ===
    async registrarArqueo() {
      const monto = n(this.arqueoForm.monto);
      if (monto < 0 || this.arqueoForm.monto === '') return this.toastMsg('Monto inválido', 'bad');
      const diff = m(monto - this.saldoCaja);
      const arq = { id:genId('aq'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), montoFisico:monto, saldoSistema:this.saldoCaja, diferencia:diff, nota:this.arqueoForm.nota, sync_flag:0, updated_at:new Date().toISOString() };
      if (Math.abs(diff) > 0.01) {
        const mov = { id:genId('mc'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), tipo:diff > 0 ? 'ingreso' : 'egreso', monto:Math.abs(diff), concepto:(diff > 0 ? 'Sobrante' : 'Faltante') + ' de arqueo', nota:this.arqueoForm.nota, sync_flag:0, updated_at:new Date().toISOString() };
        await db.transaction('rw', db.arqueos, db.mov_caja, async () => {
          await P(db.arqueos, arq);
          await P(db.mov_caja, mov);
        });
        this.toastMsg((diff > 0 ? 'Sobrante ' : 'Faltante ') + this.fmt(Math.abs(diff)), diff > 0 ? 'warn' : 'bad');
      } else {
        await P(db.arqueos, arq);
        this.toastMsg('Cuadre perfecto');
      }
      this.arqueoForm = { monto:'', nota:'' };
      await this.recargar(['arqueos', 'movCaja']);
      SyncEngine.pushChanges();
    },
    guardarCapInicial() { const val = n(this.capInicialStr); this.cfg.capitalInicial = val; this.guardarCfg(); this.capInicialStr = ''; this.toastMsg('Capital inicial guardado'); },
    registrarRetiro() {
      const monto = n(this.retiroForm.monto);
      const c = (this.retiroForm.concepto || '').trim();
      if (monto <= 0) return this.toastMsg('Monto inválido', 'bad');
      if (!c) return this.toastMsg('Concepto obligatorio', 'bad');
      if (monto > this.gananciaDisponible + 0.01) return this.toastMsg('Máximo ' + this.fmt(this.gananciaDisponible), 'bad');
      this.pedirPin(async () => {
        await P(db.retiros, { id:genId('r'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), monto, concepto:c, sync_flag:0, updated_at:new Date().toISOString() });
        await this.recargar(['retiros']);
        this.retiroForm = { monto:'', concepto:'' };
        this.toastMsg('Retiro registrado');
        await bitacora('retiro', { monto, concepto: c });
        SyncEngine.pushChanges();
      });
    },
    async registrarAporte() {
      const monto = n(this.aporteForm.monto);
      if (monto <= 0) return this.toastMsg('Monto inválido', 'bad');
      await P(db.capital, { id:genId('k'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), monto, nota:this.aporteForm.nota || '', sync_flag:0, updated_at:new Date().toISOString() });
      await this.recargar(['capital']);
      this.aporteForm = { monto:'', nota:'' };
      this.toastMsg('Aporte registrado');
      SyncEngine.pushChanges();
    },
    async registrarGasto() {
      const monto = n(this.gastoForm?.monto);
      const concepto = (this.gastoForm?.concepto || '').trim();
      if (monto <= 0) return this.toastMsg('Monto inválido', 'bad');
      if (!concepto) return this.toastMsg('Concepto obligatorio', 'bad');
      await P(db.gastos, { id:genId('g'), tienda_id:this.tiendaId, fecha:new Date().toISOString(), monto, concepto, sync_flag:0, updated_at:new Date().toISOString() });
      await this.recargar(['gastos']);
      this.gastoForm = { monto:'', concepto:'' };
      this.toastMsg('Gasto registrado');
      await bitacora('gasto', { monto, concepto });
      SyncEngine.pushChanges();
    },
    cerrarPeriodo() {
      this.pedirPin(() => {
        this.confirm = { activo:true, titulo:'Cerrar período', msg:'¿Cerrar el período actual? Los contadores del inicio se reinician y la ganancia se acumula. Esta acción no se puede deshacer.', onOk:async () => {
          const c = { id:genId('z'), tienda_id:this.tiendaId, periodo:this.fmtFecha(this.cfg.periodoInicio) + ' - ' + this.fmtFecha(new Date().toISOString()), fechaCierre:new Date().toISOString(), totalVentas:this.ventasPeriodo, totalCompras:this.comprasPeriodo, ganancia:this.gananciaNetaPeriodo, sync_flag:0, updated_at:new Date().toISOString() };
          this.cfg.periodoInicio = new Date().toISOString();
          await P(db.cierres, c);
          await this.guardarCfg();
          await this.recargar(['cierres']);
          this.toastMsg('Período cerrado');
          SyncEngine.pushChanges();
        }};
      });
    },

    // === Reportes ===
    generarReporte() {
      if (!this.rep.fechaInicio || !this.rep.fechaFin) return this.toastMsg('Selecciona fechas', 'bad');
      const i = new Date(this.rep.fechaInicio), f = new Date(this.rep.fechaFin);
      f.setHours(23, 59, 59);
      if (i > f) return this.toastMsg('Fecha inicio > fin', 'bad');
      const vp = this.ventas.filter(v => !v.anulada && new Date(v.fecha) >= i && new Date(v.fecha) <= f);
      const ing = m(vp.reduce((s, v) => s + n(v.total), 0));
      const cogs = m(vp.reduce((s, v) => s + v.items.reduce((ss, it) => ss + n(it.costo), 0), 0));
      const bruta = m(ing - cogs);
      const mermas = m(this.ajustes.filter(a => a.cantidad < 0 && new Date(a.fecha) >= i && new Date(a.fecha) <= f).reduce((s, a) => s + n(a.costoPerdida), 0));
      const gastos = m(this.gastos.filter(g => new Date(g.fecha) >= i && new Date(g.fecha) <= f).reduce((s, g) => s + n(g.monto), 0));
      const neta = m(bruta - mermas - gastos);
      this.rep.resultado = { ingresos:ing, cogs, bruta, mermas, gastos, neta, numVentas:vp.length, margenB:ing > 0 ? ((bruta / ing) * 100).toFixed(1) : '0.0', margenN:ing > 0 ? ((neta / ing) * 100).toFixed(1) : '0.0', _vp:vp };
    },
    exportarCSV() {
      const r = this.rep.resultado;
      if (!r) return;
      const rows = [['Fecha', 'Productos', 'Total', 'Ganancia']].concat(r._vp.map(v => [this.fmtFH(v.fecha), v.items.map(i => i.nombre + ' x' + i.cantidad + (i.unidad?(' '+i.unidad):'')).join('; '), v.total, v.ganancia]));
      const csv = '\uFEFF' + rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      this.descargar(new Blob([csv], { type:'text/csv;charset=utf-8' }), 'reporte-' + this.rep.fechaInicio + '.csv');
      this.toastMsg('CSV descargado');
    },
    async compartirReporte() {
      const r = this.rep.resultado;
      if (!r) return;
      const t = 'Reporte ' + this.rep.fechaInicio + ' al ' + this.rep.fechaFin + '\nIngresos: ' + this.fmt(r.ingresos) + '\nGanancia bruta: ' + this.fmt(r.bruta) + ' (' + r.margenB + '%)\nGastos: ' + this.fmt(r.gastos) + '\nGanancia neta: ' + this.fmt(r.neta) + ' (' + r.margenN + '%)\nVentas: ' + r.numVentas;
      try {
        if (navigator.share) await navigator.share({ title:'Reporte', text:t });
        else { await navigator.clipboard.writeText(t); this.toastMsg('Copiado'); }
      } catch (e) { this.toastMsg('No se pudo compartir', 'warn'); }
    },

    // === Backups ===
    buildData() { return clean({ version:6, fecha:new Date().toISOString(), cfg:this.cfg, productos:this.productos, variantes:this.variantes, lotes:this.lotes, ventas:this.ventas, compras:this.compras, ajustes:this.ajustes, arqueos:this.arqueos, movCaja:this.movCaja, cierres:this.cierres, capital:this.capital, retiros:this.retiros, gastos:this.gastos }); },
    exportar() {
      const d = this.buildData();
      this.descargar(new Blob([JSON.stringify(d, null, 2)], { type:'application/json' }), 'respaldo-tienda-' + new Date().toISOString().split('T')[0] + '.json');
      this.cfg.ultimoExport = new Date().toISOString();
      this.guardarCfg();
      this.toastMsg('Respaldo descargado');
    },
    triggerImport() { const el = document.getElementById('impFile'); if (el) el.click(); },
    onImportFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.importFile = file;
      e.target.value = '';
      this.confirm = { activo:true, titulo:'Importar datos', msg:'Esto REEMPLAZARÁ todos los datos locales. ¿Continuar?', onOk:() => this.ejecutarImport() };
    },
    ejecutarImport() {
      const file = this.importFile;
      if (!file) return;
      const rd = new FileReader();
      rd.onload = async (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d.productos && !d.ventas) throw new Error('Archivo inválido');
          await this.importarData(d);
          this.ajustesAbierto = false;
          this.toastMsg('Datos importados');
        } catch (e) { this.toastMsg('Error: ' + e.message, 'bad'); }
      };
      rd.readAsText(file);
    },
    async importarData(d) {
      const tables = ['productos','variantes','lotes','ventas','compras','ajustes','arqueos','movCaja','capital','retiros','gastos'];
      await db.transaction('rw', tables.concat(['config']), async () => {
        for (const t of tables) {
          await db.table(t).clear();
          if (Array.isArray(d[t])) await db.table(t).bulkPut(clean(d[t]));
        }
        if (d.cfg) await P(db.config, { key:'cfg', value:d.cfg });
      });
      if (d.cfg) this.cfg = Object.assign({}, this.cfg, d.cfg);
      this.aplicarTema();
      await this.recargarTodo();
    },
    async restaurarBackupAuto() {
      if (!this.ultimoBackup) return;
      this.confirm = { activo:true, titulo:'Restaurar backup', msg:'¿Reemplazar los datos con el backup automático del ' + this.fmtFH(this.ultimoBackup.fecha) + '?', onOk:async () => {
        await this.importarData(this.ultimoBackup.value);
        this.ajustesAbierto = false;
        this.toastMsg('Backup restaurado');
      }};
    },
    descargar(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); },

    // === Modales auxiliares ===
    pedirPin(cb) {
      if (!this.cfg.pinActivo) { cb(); return; }
      this.prompt = { activo:true, titulo:'PIN de seguridad', msg:'Ingresa tu PIN', placeholder:'••••', type:'password', value:'', onOk:v => { if (v === this.cfg.pin) cb(); else this.toastMsg('PIN incorrecto', 'bad'); } };
    },
    okConfirm() { const cb = this.confirm.onOk; this.confirm.activo = false; if (cb) cb(); },
    okPrompt() { const cb = this.prompt.onOk; const v = this.prompt.value; this.prompt.activo = false; if (cb) cb(v); },
    cancelPrompt() { this.prompt.activo = false; },

    // === Persistencia ===
    async guardarCfg() { try { await P(db.config, { key:'cfg', value:this.cfg }); } catch (e) { console.error('guardarCfg', e); } },
    async recargar(what) {
      const map = {
        productos: () => db.productos.toArray(),
        variantes: () => db.variantes.toArray(),
        lotes: () => db.lotes.toArray(),
        ventas: () => db.ventas.toArray(),
        compras: () => db.compras.toArray(),
        ajustes: () => db.ajustes.toArray(),
        arqueos: () => db.arqueos.toArray(),
        movCaja: () => db.mov_caja.toArray(),
        cierres: () => db.cierres.toArray(),
        capital: () => db.capital.toArray(),
        retiros: () => db.retiros.toArray(),
        gastos: () => db.gastos.toArray()
      };
      const propMap = { movCaja:'movCaja' };
      for (const w of what) {
        const prop = propMap[w] || w;
        this[prop] = await map[w]();
      }
    },
    async recargarTodo() {
      const r = await Promise.all([
        db.productos.toArray(), db.variantes.toArray(), db.lotes.toArray(),
        db.ventas.toArray(), db.compras.toArray(), db.ajustes.toArray(),
        db.arqueos.toArray(), db.mov_caja.toArray(), db.cierres.toArray(),
        db.capital.toArray(), db.retiros.toArray(), db.gastos.toArray()
      ]);
      ['productos','variantes','lotes','ventas','compras','ajustes','arqueos','movCaja','cierres','capital','retiros','gastos'].forEach((k, i) => this[k] = r[i]);
    },

    // === Gráfico ===
    renderChart() {
      try {
        const cv = document.getElementById('chartVentas');
        if (!cv || typeof Chart === 'undefined') return;
        if (this.chartInst) { try { this.chartInst.destroy(); } catch (e) {} this.chartInst = null; }
        const meses = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const f = new Date(now.getFullYear(), now.getMonth() - i, 1);
          meses.push({ m:f.getMonth(), y:f.getFullYear(), label:f.toLocaleDateString('es', { month:'short' }), v:0, g:0 });
        }
        this.ventas.filter(x => !x.anulada).forEach(v => {
          const f = new Date(v.fecha);
          const me = meses.find(x => x.m === f.getMonth() && x.y === f.getFullYear());
          if (me) { me.v += n(v.total); me.g += n(v.ganancia); }
        });
        const dark = this.cfg.tema === 'dark';
        const txt = dark ? '#94a3b8' : '#6b7280', grid = dark ? '#334155' : '#e5e7eb';
        const priRgb = getComputedStyle(document.documentElement).getPropertyValue('--pri-rgb').trim() || '33,150,243';
        this.chartInst = new Chart(cv.getContext('2d'), {
          type: 'bar',
          data: { labels: meses.map(m => m.label), datasets: [
            { label:'Ventas', data:meses.map(m => m.v), backgroundColor:`rgb(${priRgb})`, borderRadius:4 },
            { label:'Ganancia', data:meses.map(m => m.g), backgroundColor:'#16a34a', borderRadius:4 }
          ] },
          options: { responsive:true, maintainAspectRatio:false, animation:{ duration:500 }, plugins:{ legend:{ position:'bottom', labels:{ color:txt, boxWidth:12, font:{ size:10 } } }, tooltip:{ callbacks:{ label:c => ' ' + c.dataset.label + ': ' + this.fmt(c.raw) } } }, scales:{ x:{ ticks:{ color:txt, font:{ size:9 } }, grid:{ display:false } }, y:{ beginAtZero:true, ticks:{ color:txt, font:{ size:9 }, callback:v => '$' + v.toLocaleString() }, grid:{ color:grid } } } }
        });
      } catch (e) { console.error('renderChart', e); }
    },

    // === Auth flows ===
    async inicializar() {
      // 1. Verificar librerías
      this.errorLibs = checkLibs();
      if (this.errorLibs.length > 0) {
        this.cargando = false;
        return;
      }

      // 2. Intentar restaurar sesión
      try {
        const perf = await restaurarSesion();
        if (perf && !perf.bloqueado) {
          await this.cargarDatosTienda();
          this.sesionIniciada = true;
          iniciarChequeoRemoto();
        }
      } catch (e) { console.warn('restaurarSesion:', e); }

      this.cargando = false;
    },
    async cargarDatosTienda() {
      // Cargar cfg
      const c = await db.config.get('cfg');
      if (c) this.cfg = Object.assign({}, this.cfg, c.value);
      else await this.guardarCfg();
      this.aplicarTema();
      this.capInicialStr = String(this.cfg.capitalInicial || '');

      // Pre-cargar TODO en RAM (Punto 49)
      await this.recargarTodo();

      // Backup automático
      const b = await db.config.get('backupAuto');
      if (b) this.ultimoBackup = b;
      const ahora = Date.now();
      if (!this.cfg.ultimoBackupAuto || (ahora - this.cfg.ultimoBackupAuto) > 86400000) {
        await this.backupAuto();
        this.cfg.ultimoBackupAuto = ahora;
        await this.guardarCfg();
        const b2 = await db.config.get('backupAuto');
        if (b2) this.ultimoBackup = b2;
      }

      // Restaurar sección desde URL
      const hash = location.hash.slice(1);
      const valid = ['dashboard','ventas','compras','productos','inventario','caja','patrimonio','reportes'];
      if (valid.includes(hash)) this.sec = hash;

      // Cargar empleados (admin)
      if (this.esAdmin) {
        this.empleados = await listarEmpleados();
      }

      // Sync inicial
      SyncEngine.init();
    },
    async doLogin() {
      this.loginForm.email = (this.loginForm.email || '').trim();
      if (!this.loginForm.email || !this.loginForm.password) return this.toastMsg('Completa email y contraseña', 'bad');
      this.cargando = true;
      const res = await iniciarSesion(this.loginForm.email, this.loginForm.password);
      if (res.success) {
        await this.cargarDatosTienda();
        this.sesionIniciada = true;
        iniciarChequeoRemoto();
        this.toastMsg('Bienvenido ' + Auth.perfil.username);
        this.loginForm = { email:'', password:'', nombreTienda:'' };
      } else {
        this.toastMsg(res.error, 'bad');
      }
      this.cargando = false;
    },
    async doRegister() {
      this.loginForm.email = (this.loginForm.email || '').trim();
      this.loginForm.nombreTienda = (this.loginForm.nombreTienda || '').trim();
      if (!this.loginForm.email || !this.loginForm.password || !this.loginForm.nombreTienda) return this.toastMsg('Completa todos los campos', 'bad');
      this.cargando = true;
      const res = await registrarTienda(this.loginForm.email, this.loginForm.password, this.loginForm.nombreTienda);
      if (res.success) {
        await this.cargarDatosTienda();
        this.sesionIniciada = true;
        iniciarChequeoRemoto();
        this.toastMsg('¡Tienda creada!');
        this.loginForm = { email:'', password:'', nombreTienda:'' };
      } else {
        this.toastMsg(res.error, 'bad');
      }
      this.cargando = false;
    },
    async doLogout() {
      this.confirm = { activo:true, titulo:'Cerrar sesión', msg:'¿Seguro que quieres salir?', onOk:async () => {
        await cerrarSesion();
        this.sesionIniciada = false;
        this.sec = 'dashboard';
        this.productos = this.variantes = this.lotes = this.ventas = this.compras = this.ajustes = this.arqueos = this.movCaja = this.cierres = this.capital = this.retiros = this.gastos = this.empleados = [];
        this.toastMsg('Sesión cerrada');
      }};
    },

    // === Empleados ===
    async abrirEmpleados() {
      this.empModalAbierto = true;
      this.empleados = await listarEmpleados();
    },
    async crearEmpleado() {
      if (!this.empForm.username || !this.empForm.password) return this.toastMsg('Completa usuario y contraseña', 'bad');
      const res = await crearEmpleado(this.empForm.username, this.empForm.password, this.empForm.rol);
      if (res.success) {
        this.toastMsg('Empleado creado. Email: ' + res.email);
        this.empForm = { username:'', password:'', rol:'cajero' };
        this.empleados = await listarEmpleados();
        await bitacora('empleado_creado', { username: this.empForm.username, rol: this.empForm.rol });
      } else {
        this.toastMsg(res.error, 'bad');
      }
    },
    async toggleEmpleado(emp) {
      const res = await toggleEmpleadoActivo(emp.id, !emp.activo);
      if (res.success) {
        this.toastMsg(emp.activo ? 'Empleado desactivado' : 'Empleado activado');
        this.empleados = await listarEmpleados();
        await bitacora(emp.activo ? 'empleado_desactivado' : 'empleado_activado', { username: emp.username });
      } else {
        this.toastMsg(res.error, 'bad');
      }
    },
    async eliminarEmpleadoConfirm(emp) {
      this.confirm = { activo:true, titulo:'Eliminar empleado', msg:'¿Eliminar a "' + emp.username + '"? Esta acción no se puede deshacer.', onOk:async () => {
        const res = await eliminarEmpleado(emp.id);
        if (res.success) {
          this.toastMsg('Empleado eliminado');
          this.empleados = await listarEmpleados();
          await bitacora('empleado_eliminado', { username: emp.username });
        } else {
          this.toastMsg(res.error, 'bad');
        }
      }};
    },

    // === Backup ===
    async backupAuto() { try { const data = this.buildData(); await P(db.config, { key:'backupAuto', value:data, fecha:new Date().toISOString() }); } catch (e) {} },

    // === Update SW ===
    aplicarUpdate() { if (this.swWaiting) { this.aplicandoSw = true; try { this.swWaiting.postMessage('SKIP_WAITING'); } catch (e) {} } }
  },
  watch: {
    carrito: { handler(val) { try { localStorage.setItem('carritoPro', JSON.stringify(val)); } catch (e) {} }, deep: true },
    'cfg.tema'() { this.aplicarTema(); if (this.sec === 'dashboard') this.$nextTick(() => requestAnimationFrame(() => this.renderChart())); },
    'cfg.colorPri'() { this.aplicarTema(); },
    sec(s) { if (s === 'dashboard') this.$nextTick(() => requestAnimationFrame(() => this.renderChart())); }
  },
  mounted() {
    this.inicializar();

    window.addEventListener('online', () => {
      this.online = true;
      this.toastMsg('Conectado · sincronizando...', 'ok', '', null);
      setTimeout(() => SyncEngine.syncNow(), 500);
    });
    window.addEventListener('offline', () => { this.online = false; this.toastMsg('Modo Offline activado', 'warn'); });
    window.addEventListener('popstate', e => { this.sec = (e.state && e.state.sec) || 'dashboard'; });
    window.addEventListener('resize', () => { if (this.sec === 'dashboard') this.renderChart(); });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('sw.js');
          const avisar = sw => { if (!sw) return; this.swWaiting = sw; this.hayUpdate = true; };
          avisar(reg.waiting);
          reg.addEventListener('updatefound', () => { const nw = reg.installing; if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) avisar(reg.waiting); }); });
          navigator.serviceWorker.addEventListener('controllerchange', () => { if (this.aplicandoSw) location.reload(); });
          setInterval(() => reg.update(), 3600000);
        } catch (e) {}
      });
    }
  }
});

// === Capturador global de errores Vue (Punto 32) ===
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info);
  const appEl = document.getElementById('app');
  if (appEl) appEl.removeAttribute('v-cloak');
  if (instance && instance.toastMsg) {
    try { instance.toastMsg('Error de renderizado: ' + err.message, 'bad'); } catch (e) {}
  }
};

// === Componente icon ===
app.component('icon', {
  props: { name:String, size:{ type:[Number, String], default:22 }, color:{ type:String, default:'#2196F3' } },
  render() {
    const s = parseInt(this.size) || 22;
    return h('svg', {
      width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: this.color,
      'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      style: 'flex-shrink:0; vertical-align:middle; display:inline-block;',
      innerHTML: PATHS[this.name] || ''
    });
  }
});

app.mount('#app');
