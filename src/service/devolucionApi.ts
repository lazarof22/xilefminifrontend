import { apiRequest } from './httpClient';

export type DevolucionTipo = 'venta' | 'proveedor';
export type DevolucionOrigenTipo = 'venta' | 'factura' | 'registro_compra';
export type FormaDevolucionDinero = 'efectivo' | 'nota_credito' | 'descuenta_deuda';
export type EstadoDevolucion = 'pendiente' | 'aplicando' | 'registrada' | 'fallida';

export interface LineaDevolucionDto {
    producto: string;
    cantidadSolicitada: number;
    cantidadEntregada: number;
}

export interface CrearDevolucionDto {
    tipo: DevolucionTipo;
    origenTipo: DevolucionOrigenTipo;
    origenRef: string;
    motivo: string;
    lineas: LineaDevolucionDto[];
    autorizadoPor: string;
    recibidoPor: string;
    firma: string;
}

export interface LineaDevolucion {
    producto: string;
    cantidadSolicitada: number;
    cantidadEntregada: number;
    precioUnitario: number;
    importe: number;
}

/** Vale de Entrega o Devolución (SC-2-08) tal como lo guarda el servidor. */
export interface Devolucion {
    _id: string;
    numeroConsecutivo: string;
    tipo: DevolucionTipo;
    origenTipo: DevolucionOrigenTipo;
    origenRef: string;
    motivo: string;
    cliente?: string;
    lineas: LineaDevolucion[];
    autorizadoPor: string;
    recibidoPor: string;
    firma: string;
    /** Solo en devoluciones de venta; el servidor la deduce del pago original. */
    formaDevolucionDinero?: FormaDevolucionDinero;
    montoDevuelto: number;
    moneda: string;
    estado: EstadoDevolucion;
    fecha: string;
    errorAplicacion?: string;
}

export interface FiltrosDevolucion {
    formaDevolucionDinero?: FormaDevolucionDinero;
    tipo?: DevolucionTipo;
    origenRef?: string;
    estado?: EstadoDevolucion;
    /** AAAA-MM-DD o ISO 8601. */
    desde?: string;
    hasta?: string;
    pagina?: number;
    limite?: number;
}

export interface ListadoDevoluciones {
    datos: Devolucion[];
    total: number;
    pagina: number;
    limite: number;
}

export const ETIQUETA_FORMA_DEVOLUCION: Record<FormaDevolucionDinero, string> = {
    efectivo: 'Efectivo',
    nota_credito: 'Nota de crédito',
    descuenta_deuda: 'Descuenta la deuda',
};

/** Qué forma de dinero corresponde a cada método de pago original (doc §7.3). */
export function formaPorMetodoPago(metodoPago: string | undefined): FormaDevolucionDinero | undefined {
    switch ((metodoPago ?? '').toLowerCase()) {
        case 'efectivo':
            return 'efectivo';
        case 'transferencia':
            return 'nota_credito';
        case 'credito':
            return 'descuenta_deuda';
        default:
            return undefined;
    }
}

export const crearDevolucion = (dto: CrearDevolucionDto): Promise<Devolucion> =>
    apiRequest<Devolucion>('/devolucion', { method: 'POST', body: JSON.stringify(dto) });

export function listarDevoluciones(filtros: FiltrosDevolucion = {}): Promise<ListadoDevoluciones> {
    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== '') params.set(clave, String(valor));
    }
    const consulta = params.toString();
    return apiRequest<ListadoDevoluciones>(`/devolucion${consulta ? `?${consulta}` : ''}`);
}

export const obtenerDevolucion = (id: string): Promise<Devolucion> =>
    apiRequest<Devolucion>(`/devolucion/${id}`);

/** Una línea del documento de origen que se puede devolver. */
export interface LineaOrigenDevolucion {
    productoId: string;
    nombre: string;
    /** Cantidad vendida (o comprada) en el origen. */
    cantidad: number;
}

/** Documento del que se devuelve mercancía. */
export interface OrigenDevolucion {
    tipo: DevolucionTipo;
    origenTipo: DevolucionOrigenTipo;
    origenRef: string;
    /** Texto para el usuario, por ejemplo el número de factura. */
    etiqueta: string;
    lineas: LineaOrigenDevolucion[];
    /** Método de pago original (efectivo, transferencia, credito) solo para la ayuda en pantalla. */
    metodoPago?: string;
}

/** Venta como la devuelve `GET /venta` (productos y pago poblados). */
export interface VentaParaDevolucion {
    _id: string;
    pago?: { metodoPago?: string } | string;
    productos?: {
        productoId: string | { _id: string; nombre_producto?: string };
        cantidad: number;
    }[];
}

/** Arma el origen de una devolución de venta a partir de la venta que lista el backend. */
export function origenDeVenta(venta: VentaParaDevolucion): OrigenDevolucion {
    return {
        tipo: 'venta',
        origenTipo: 'venta',
        origenRef: venta._id,
        etiqueta: `V-${venta._id.slice(-6).toUpperCase()}`,
        metodoPago: typeof venta.pago === 'object' ? venta.pago.metodoPago : undefined,
        lineas: (venta.productos ?? []).map((p) => {
            const id = typeof p.productoId === 'string' ? p.productoId : p.productoId._id;
            const nombre = typeof p.productoId === 'string' ? id : (p.productoId.nombre_producto ?? id);
            return { productoId: id, nombre, cantidad: Number(p.cantidad) || 0 };
        }),
    };
}

// ─── Otros orígenes: factura y compra a proveedor ─────────────────────────

/** Factura como la devuelve `GET /facturas` (solo lo que necesita el vale). */
export interface FacturaParaDevolucion {
    /** Id de Mongo: es el `origenRef` del vale. */
    _id: string;
    /** Identificador legible de la factura (p. ej. FAC-000012). */
    id?: string;
    numero?: number;
    cliente?: string;
    fecha?: string;
    estado?: string;
    inventarioAplicado?: boolean;
    metodoPago?: string;
    total?: number;
    moneda?: string;
    items?: { productoId: string; productoNombre?: string; cantidad: number }[];
}

/** Compra de inventario como la devuelve `GET /registro-compra` (referencias pobladas). */
export interface CompraParaDevolucion {
    _id: string;
    producto: string | { _id: string; nombre_producto?: string; codigo_producto?: string } | null;
    cantidad: number;
    costo_unitario?: number;
    total?: number;
    fecha?: string;
}

/** Máximo de facturas que acepta el listado del servidor por página. */
const LIMITE_FACTURAS = 500;

/**
 * Facturas de las que se puede devolver mercancía: el servidor solo acepta las confirmadas
 * cuyo inventario ya se descontó.
 */
export async function listarFacturasDevolvibles(): Promise<FacturaParaDevolucion[]> {
    const facturas = await apiRequest<FacturaParaDevolucion[]>(`/facturas?limit=${LIMITE_FACTURAS}`);
    return facturas.filter((f) => f.estado === 'confirmada' && f.inventarioAplicado === true);
}

/** Compras registradas, más recientes primero (cada una trae un único producto). */
export const listarComprasDevolvibles = (): Promise<CompraParaDevolucion[]> =>
    apiRequest<CompraParaDevolucion[]>('/registro-compra');

export const etiquetaFactura = (f: FacturaParaDevolucion): string =>
    f.id ?? (f.numero !== undefined ? `Factura ${f.numero}` : `F-${f._id.slice(-6).toUpperCase()}`);

const productoDeCompra = (c: CompraParaDevolucion): { id: string; nombre: string } => {
    if (!c.producto) return { id: '', nombre: 'Producto eliminado' };
    if (typeof c.producto === 'string') return { id: c.producto, nombre: c.producto };
    return { id: c.producto._id, nombre: c.producto.nombre_producto ?? c.producto._id };
};

export const etiquetaCompra = (c: CompraParaDevolucion): string =>
    `Compra C-${c._id.slice(-6).toUpperCase()} · ${productoDeCompra(c).nombre}`;

/** Arma el origen de una devolución de venta a partir de una factura confirmada. */
export function origenDeFactura(factura: FacturaParaDevolucion): OrigenDevolucion {
    // Una factura puede repetir un producto en varias líneas: se suman como hace el servidor.
    const porProducto = new Map<string, LineaOrigenDevolucion>();
    for (const item of factura.items ?? []) {
        const actual = porProducto.get(item.productoId);
        const cantidad = Number(item.cantidad) || 0;
        if (actual) actual.cantidad += cantidad;
        else {
            porProducto.set(item.productoId, {
                productoId: item.productoId,
                nombre: item.productoNombre ?? item.productoId,
                cantidad,
            });
        }
    }
    return {
        tipo: 'venta',
        origenTipo: 'factura',
        origenRef: factura._id,
        etiqueta: etiquetaFactura(factura),
        metodoPago: factura.metodoPago,
        lineas: [...porProducto.values()],
    };
}

/**
 * Arma el origen de una devolución a proveedor a partir de una compra registrada. No lleva
 * método de pago: el servidor no deduce ni acepta forma de dinero en este tipo.
 */
export function origenDeCompra(compra: CompraParaDevolucion): OrigenDevolucion {
    const { id, nombre } = productoDeCompra(compra);
    return {
        tipo: 'proveedor',
        origenTipo: 'registro_compra',
        origenRef: compra._id,
        etiqueta: `compra C-${compra._id.slice(-6).toUpperCase()}`,
        lineas: id ? [{ productoId: id, nombre, cantidad: Number(compra.cantidad) || 0 }] : [],
    };
}
