/** Tipos de dominio Tienda Pro */

export interface Producto {
  id: string; nombre: string; codigo?: string; unidad?: string;
  precio?: number; stockMinimo?: number; archivado?: boolean;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface ProductoVariante {
  id: string; productoId: string; nombre: string; codigo?: string;
  unidad?: string; precioBase: number; stockMinimo?: number;
  archivado?: boolean; esCaja?: boolean; unidadesPorCaja?: number;
  varianteUnidadId?: string; preciosEscalonados?: PrecioEscalonado[];
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface PrecioEscalonado { min: number; max: number; precio: number; }

export interface Lote {
  id: string; productoId: string; varianteId: string;
  cantidadInicial: number; cantidadVendida: number; costo: number;
  fecha: string; creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface VentaItem {
  productoId: string; varianteId: string; nombre: string;
  cantidad: number; precio: number; costo: number; ganancia: number;
  lotesUsados?: LoteUsado[];
}

export interface LoteUsado { loteId: string; cantidad: number; costo: number; }

export interface Venta {
  id: string; fecha: string; items: VentaItem[]; total: number;
  ganancia: number; efectivoRecibido?: number; cambio?: number;
  anulada?: boolean; motivoAnulacion?: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Compra {
  id: string; productoId: string; varianteId: string;
  productoNombre?: string; cantidad: number; costo: number;
  total: number; fecha: string; anulada?: boolean;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Ajuste {
  id: string; productoId: string; varianteId: string;
  cantidad: number; tipo: 'merma' | 'sobrante' | 'ajuste';
  costoPerdida: number; fecha: string; lotesUsados?: LoteUsado[];
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface MovCaja {
  id: string; fecha: string; tipo: 'ingreso' | 'egreso';
  monto: number; concepto: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Arqueo {
  id: string; fecha: string; montoFisico: number; saldoSistema: number;
  diferencia: number; nota?: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Retiro {
  id: string; fecha: string; monto: number; concepto: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Capital {
  id: string; fecha: string; monto: number; nota?: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Cierre {
  id: string; fecha: string; ingresos: number; cogs: number;
  bruta: number; mermas: number; gastos: number; neta: number;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface GastoOp {
  id: string; fecha: string; monto: number; concepto: string;
  tiendaId?: string;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Tienda {
  id?: number; nombre: string; activa?: boolean;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface Socio {
  id?: number; tiendaId: number; nombre: string; porcentaje: number;
  creado?: string; updatedAt?: string; updatedBy?: string;
  version?: number; deletedAt?: string | null;
}

export interface ConfigValue {
  nombreNegocio?: string; simboloMoneda?: string;
  capitalInicial?: number; periodoInicio?: string;
  _moneyMigrated?: boolean; _variantesMigrated?: boolean;
  webhookUrl?: string; [key: string]: unknown;
}

export interface Config { key: string; value: ConfigValue; }

export interface SyncState {
  id?: number; deviceId: string; tabla: string;
  lastSyncAt: string; lastSyncVersion: number;
}

export interface SyncLogEntry {
  id?: number; tabla: string; recordId: string;
  operation: string; recordData: unknown; timestamp: string;
  sourceDevice: string; status: 'pending' | 'sent' | 'acked';
  retryCount: number;
}

export interface DeviceInfo {
  id: string; deviceId: string; name?: string; createdAt?: string;
}

export interface ErrorDB {
  tipo: 'quota' | 'version' | 'open' | 'desconocido';
  mensaje: string; original: unknown;
}

export interface DeltaResult {
  inserted: number; updated: number; skipped: number; conflicts: number;
}

export interface RecalcStockResult {
  recalculados: number; totalLotes: number;
}
