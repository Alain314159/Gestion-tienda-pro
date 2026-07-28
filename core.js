// ================================================================
// CORE.JS - Cerebro de la App (Vue 3 + Lógica de Negocio)
// ================================================================

const PATHS = {
  home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  bag:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  package:'<path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  tag:'<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  wallet:'<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
  chart:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  trend:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit:'<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  chevron:'<polyline points="6 9 12 15 18 9"/>',
  store:'<path d="M2 7l1.5-4h17L22 7"/><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><path d="M2 7h20"/><path d="M9 21v-6h6v6"/>'
};

const { h } = Vue;
const app = Vue.createApp({
  data() {
    return {
      cargando: true,
      Auth: window.Auth, // Conecta el sistema de login
      cfg: { tema: 'light', moneda: '$', nombre: 'Tienda Pro' },
      sec: 'dashboard',
      masAbierto: false,
      toast: { show: false, msg: '', type: 'ok', timer: null },
      loginForm: { email: '', password: '' },
      // Datos locales
      productos: [], lotes: [], ventas: [], carrito: [],
      busqVenta: '', focusVenta: false
    };
  },
  computed: {
    totalCarrito() {
      return this.carrito.reduce((s, it) => s + (m(it.precio) * q(it.cant)), 0);
    }
  },
  methods: {
    navColor(active) { return active ? '#2196F3' : '#6b7280'; },
    fmt(val) { 
      const v = mFmt(m(val)); 
      return (this.cfg.moneda || '$') + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    },
    fmtCant(val) { 
      const v = q(val); 
      if (Number.isInteger(v)) return v.toString(); 
      return v.toFixed(3).replace(/\.?0+$/, ''); 
    },
    toastMsg(msg, type = 'ok') {
      clearTimeout(this.toast.timer);
      this.toast = { show: true, msg, type, timer: null };
      this.toast.timer = setTimeout(() => { this.toast.show = false; }, 3000);
    },
    ir(s) { this.masAbierto = false; this.sec = s; },
    async iniciarSesion() {
      this.cargando = true;
      const res = await window.iniciarSesion(this.loginForm.email, this.loginForm.password);
      if (res.success) {
        await this.cargarDatosLocales();
        this.toastMsg('Bienvenido ' + this.Auth.perfil.username);
      } else {
        this.toastMsg(res.error, 'bad');
      }
      this.cargando = false;
    },
    async cerrarSesion() {
      await window.cerrarSesion();
      this.sec = 'dashboard';
      this.toastMsg('Sesión cerrada');
    },
    async cargarDatosLocales() {
      // Carga solo los datos de LA TIENDA del usuario logueado
      const tid = this.Auth.perfil.tienda_id;
      this.productos = await db.productos.where('tienda_id').equals(tid).toArray();
      this.lotes = await db.lotes.where('tienda_id').equals(tid).toArray();
      this.ventas = await db.ventas.where('tienda_id').equals(tid).toArray();
    },
    stock(pid) {
      return this.lotes.filter(l => l.producto_id === pid).reduce((s, l) => s + (q(l.cantidad_inicial) - q(l.cantidad_vendida)), 0);
    },
    agregarCarrito(p) {
      const ex = this.carrito.find(i => i.producto_id === p.id);
      if (ex) {
        ex.cant = q(ex.cant) + 1;
      } else {
        this.carrito.push({ producto_id: p.id, nombre: p.nombre, precio: p.precio, cant: 1, unidad: p.unidad });
      }
    },
    async procesarVenta() {
      try {
        const tid = this.Auth.perfil.tienda_id;
        const uid = this.Auth.usuario.id;
        let tot = 0, items = [];
        
        for (const it of this.carrito) {
          const sub = m(it.precio) * q(it.cant);
          tot += sub;
          items.push({ producto_id: it.producto_id, nombre: it.nombre, cantidad: q(it.cant), precio: m(it.precio), subtotal: sub });
          // Descontar stock FIFO (Simplificado para este paso)
          let rest = q(it.cant);
          const lotes = this.lotes.filter(l => l.producto_id === it.producto_id && (q(l.cantidad_inicial) - q(l.cantidad_vendida)) > 0);
          for (const l of lotes) {
            if (rest <= 0) break;
            const disp = q(l.cantidad_inicial) - q(l.cantidad_vendida);
            const usar = Math.min(disp, rest);
            l.cantidad_vendida = q(l.cantidad_vendida) + usar;
            l.sync_flag = 0; // Marcar para sincronizar
            await db.lotes.put(l);
            rest -= usar;
          }
        }

        const venta = {
          id: 'v_' + Date.now(),
          tienda_id: tid,
          usuario_id: uid,
          fecha: new Date().toISOString(),
          items: items,
          total: tot,
          ganancia: 0, // Calcular en sync si es necesario
          anulada: false,
          sync_flag: 0 // Marcar para sincronizar
        };
        
        await db.ventas.put(venta);
        this.ventas.unshift(venta);
        this.carrito = [];
        this.toastMsg('Venta exitosa: ' + this.fmt(tot));
        
        // Forzar sincronización en segundo plano
        SyncEngine.pushChanges();
      } catch (e) {
        this.toastMsg('Error: ' + e.message, 'bad');
      }
    }
  },
  async mounted() {
    // Verificar si ya hay sesión abierta al cargar la app
    const { data } = await Auth.supabase.auth.getSession();
    if (data.session) {
      Auth.usuario = data.session.user;
      const { data: perf } = await Auth.supabase.from('perfiles').select('*, tiendas(*)').eq('id', Auth.usuario.id).single();
      if (perf && perf.activo) {
        Auth.perfil = perf;
        Auth.tienda = perf.tiendas;
        await this.cargarDatosLocales();
      }
    }
    this.cargando = false;
    SyncEngine.init(); // Iniciar motor de sincronización
  }
});

// Componente de Iconos SVG
app.component('icon', {
  props: { name:String, size:{ type:[Number, String], default:22 }, color:{ type:String, default:'#2196F3' } },
  render() {
    const s = parseInt(this.size) || 22;
    return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: this.color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'flex-shrink:0; vertical-align:middle; display:inline-block;', innerHTML: PATHS[this.name] || '' });
  }
});

app.mount('#app');