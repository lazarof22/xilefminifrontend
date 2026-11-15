// Tipos de la API de facturas (`/facturas`). Reflejan lo que guarda y devuelve el servidor:
// los totales y el estado los calcula siempre el servidor.

export type EstadoFactura = 'edicion' | 'terminada' | 'confirmada' | 'cancelada' | 'anulada';

export type MetodoPagoFactura = 'efectivo' | 'transferencia' | 'credito';

/** Límites del motivo obligatorio al cancelar o anular una factura (apartados 6.3 y 7.2). */
export const MOTIVO_ANULACION_MIN = 5;
export const MOTIVO_ANULACION_MAX = 300;

export interface ItemFactura {
    id: string;
    productoId: string;
    productoNombre: string;
    unidadMedida?: string;
    cantidad: number;
    precio: number;
    costo: number;
    descuentoPct: number;
    descuentoMonto: number;
    recargo: number;
    /** Lo recalcula el servidor; en el formulario es solo una vista previa. */
    total: number;
    exento?: boolean;
}

export interface ImpuestoFactura {
    tipo?: string;
    porciento?: number;
    importe?: number;
}

export interface EmisorFactura {
    nombre?: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    reeup?: string;
    ciudad?: string;
    pais?: string;
}

/** "Despachado por", "Transportado por" y "Recibido por". */
export interface ParticipanteFactura {
    nombre: string;
    ci: string;
    /** AAAA-MM-DD */
    fecha: string;
}

export interface FacturadorFactura {
    empleadoId?: string;
    nombre: string;
    ci: string;
    fecha: string;
}

/** Quién autorizó la anulación o cancelación. */
export interface AnuladaPorFactura {
    userId: string;
    nombre: string;
}

export interface Factura {
    _id?: string;
    /** Identificador visible (FAC-000001); es el que usan las rutas `/facturas/:id`. */
    id: string;
    numero: number;
    fecha: string;
    cliente: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    moneda: string;
    concepto?: string;
    almacenId?: string;
    almacenCodigo?: string;
    emisor?: EmisorFactura;
    impuesto?: ImpuestoFactura;
    metodoPago: MetodoPagoFactura | string;
    talonario?: string;
    items: ItemFactura[];
    subtotal: number;
    descuentoTotal: number;
    recargoTotal: number;
    total: number;
    estado: EstadoFactura;
    tipo: 'factura_normal' | 'ajuste' | string;
    impreso: boolean;
    despachadoPor?: ParticipanteFactura;
    transportadoPor?: ParticipanteFactura;
    recibidoPor?: ParticipanteFactura;
    facturadoPor?: FacturadorFactura;
    /** Solo en facturas canceladas o anuladas. */
    motivoAnulacion?: string;
    anuladaPor?: AnuladaPorFactura;
    fechaAnulacion?: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Línea enviada al servidor: sin `total` ni `exento` (el servidor los rechaza). */
export interface ItemFacturaDto {
    id: string;
    productoId: string;
    productoNombre: string;
    unidadMedida?: string;
    cantidad: number;
    precio: number;
    costo: number;
    descuentoPct: number;
    descuentoMonto: number;
    recargo: number;
}

export interface CrearFacturaDto {
    fecha?: string;
    cliente?: string;
    nit?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    moneda?: string;
    concepto?: string;
    almacenId: string;
    impuesto?: ImpuestoFactura;
    metodoPago: MetodoPagoFactura;
    items: ItemFacturaDto[];
    tipo?: 'factura_normal' | 'ajuste';
    impreso?: boolean;
    despachadoPor?: ParticipanteFactura;
    transportadoPor?: ParticipanteFactura;
    recibidoPor?: ParticipanteFactura;
    talonario?: string;
}

/** PATCH /facturas/:id: los campos admitidos dependen del estado de la factura en el servidor. */
export type ActualizarFacturaDto = Partial<Omit<CrearFacturaDto, 'tipo'>>;
