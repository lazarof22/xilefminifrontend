// src/types/venta.types.ts
// Tipos para integración Punto de Venta ↔ Backend NestJS (POST /venta/checkout)

// ─── Producto en carrito (del frontend) ──────────────────────
export interface ProductoCarrito {
    id: string;           // _id de MongoDB
    codigo: string;
    nombre: string;
    precio: number;
    stock: number;
    categoria: string;
    cantidad: number;
    descuento: number;    // % de descuento
}

// ─── Desglose de billetes (CUP) ──────────────────────────────
export interface DesgloseBilletes {
    billete5000: number;
    billete2000: number;
    billete1000: number;
    billete500: number;
    billete200: number;
    billete100: number;
    billete50: number;
    billete20: number;
    billete10: number;
    billete5: number;
    billete3: number;
    billete1: number;
}

// ═══════════════════════════════════════════════════════════════
// CHECKOUT — el cliente NO envía precios, impuestos ni totales
// ═══════════════════════════════════════════════════════════════

/** Línea de la venta: solo qué producto, cuántos y qué % de descuento. El precio lo pone el servidor. */
export interface ItemCheckout {
    productoId: string;
    cantidad: number;
    descuentoPct: number;
}

export type TipoClientePago = 'cliente-estandar' | 'cliente-por-descuento' | 'cliente-cuenta-casa';

export interface DatosClienteDescuento {
    nombre: string;
    ci: string;
    telefono: string;
}

/** Con qué se identifica un cliente: CI (persona natural) o NIT (empresa o mipyme). */
export type TipoIdentidad = 'CI' | 'NIT';

/** Por dónde llega una transferencia. Zelle es un canal de pago, no una moneda: se paga en USD. */
export type CanalTransferencia = 'banco' | 'transfermovil' | 'enzona' | 'zelle';

/** Si el número que se escribió en una transferencia es de una cuenta o de una tarjeta. */
export type TipoCuentaTransferencia = 'cuenta' | 'tarjeta';

/**
 * Cómo paga el cliente. No lleva importes: el efectivo recibido sale de sumar el desglose y
 * lo que hay que cobrar lo calcula el servidor (en otra moneda, con la tasa vigente).
 */
export type PagoCheckout =
    | {
          tipo: 'efectivo';
          /** Moneda en la que entrega el dinero el cliente (CUP si se omite). */
          moneda?: string;
          /** Billetes y monedas recibidos de esa moneda: valor → cantidad (`{ "100": 1, "20": 2 }`). */
          desgloseDenominaciones?: Record<string, number>;
          /** Desglose anterior, solo de CUP: se usa cuando el servidor no informó los billetes. */
          desglose?: Partial<DesgloseBilletes>;
          /** Moneda en la que se devuelve el cambio (la misma del pago si se omite). */
          monedaCambio?: string;
          tipoCliente?: TipoClientePago;
          datosClienteDescuento?: DatosClienteDescuento;
      }
    | {
          tipo: 'credito';
          tipoIdentidad?: TipoIdentidad;
          /** CI: exactamente 11 dígitos. */
          ci?: string;
          /** NIT: letras, números y guiones (5 a 20). */
          nit?: string;
          /** Teléfono sin el prefijo de país. */
          telefono?: string;
          /** Prefijo de país del teléfono (+53 si se omite). */
          codigoPais?: string;
      }
    | {
          tipo: 'transferencia';
          /** Canal de la transferencia (`banco` si se omite). */
          canal?: CanalTransferencia;
          /** Banco del nomenclador (obligatorio en el canal `banco`). */
          bancoId?: string;
          /** Código del banco como texto: solo si el nomenclador de bancos no se pudo leer. */
          banco?: string;
          tipoCuenta?: TipoCuentaTransferencia;
          numeroCuenta: string;
          /** Moneda de la transferencia (la del canal si se omite: Zelle → USD). */
          moneda?: string;
          notas?: string;
          ciCliente?: string;
          nombreCliente?: string;
      };

/** Lo que la pantalla le mostró al cajero. Solo informativo: el servidor nunca cobra con esto. */
export interface EstimadoCheckout {
    subtotal: number;
    descuento: number;
    impuesto: number;
    total: number;
}

export interface SolicitudCheckout {
    /** Solo si es un _id de MongoDB válido (obligatorio a crédito). */
    clienteId?: string;
    items: ItemCheckout[];
    pago: PagoCheckout;
    estimado?: EstimadoCheckout;
}

export interface ItemVentaRegistrado {
    productoId: string;
    codigo: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    descuentoPct: number;
    subtotal: number;
    descuento: number;
    impuesto: number;
    total: number;
    /** Lo que queda del producto tras esta venta. */
    stockRestante: number;
}

/** Tasas con las que se cobró en otra moneda: CUP por 1 unidad de cada moneda (la del CUP es 1). */
export interface TasaUsadaVenta {
    tipo: TipoTasa;
    monedaPago: string;
    tasaPago: number;
    /** Solo en efectivo: la moneda en la que se devolvió el cambio. */
    monedaCambio?: string;
    tasaCambio?: number;
    /** Fecha de la tasa más reciente entre las usadas. */
    fecha?: string;
}

/** Respuesta del servidor: siempre los totales DEL SERVIDOR. */
export interface RespuestaCheckout {
    venta: {
        _id: string;
        comprobante: string;
        fecha: string;
        clienteId?: string;
        clienteNombre?: string;
        items: ItemVentaRegistrado[];
        subtotal: number;
        descuento: number;
        impuestoPorciento: number;
        impuesto: number;
        /** Total de la venta, siempre en CUP. */
        total: number;
    };
    pago: {
        _id: string;
        tipo: string;
        /** Efectivo recibido, en la moneda del pago. */
        montoRecibido: number;
        /** Cambio, en la moneda del pago. */
        cambio: number;
        esCuentaCasa: boolean;
        /** Moneda en la que pagó el cliente (solo si no fue el CUP de siempre). */
        moneda?: string;
        /** Lo que había que cobrar, expresado en `moneda`. */
        montoAPagarMoneda?: number;
        /** Moneda en la que se devolvió el cambio. */
        monedaCambio?: string;
        /** El cambio expresado en `monedaCambio` (solo si difiere de `moneda`). */
        cambioConvertido?: number;
        /** Billetes y monedas recibidos: valor → cantidad. */
        desgloseValidado?: Record<string, number>;
        tasaUsada?: TasaUsadaVenta;
    };
    /** Cambio, en la moneda del pago. */
    cambio: number;
    /** El cambio en la moneda de devolución, si difiere de la del pago. */
    cambioConvertido?: number;
    tasaUsada?: TasaUsadaVenta;
    comprobante: string;
    /** Avisos que no impidieron el cobro (por ejemplo, un número de tarjeta que no parece del banco). */
    advertencias: string[];
    idempotencia: {
        clave: string;
        estado: 'completada';
        repetida: boolean;
    };
}

/** Tasa con la que se convierten las monedas: la del Banco Central o la del mercado informal. */
export type TipoTasa = 'tasaBancoCentral' | 'tasaMercadoInformal';

/** Una moneda con la que se puede cobrar ahora mismo, con su tasa y sus billetes (GET /venta/parametros). */
export interface MonedaCobro {
    /** CUP, USD, EUR... */
    codigo: string;
    nombre: string;
    /** Cuántos CUP vale 1 unidad de la moneda con la tasa vigente (la del CUP es 1). */
    cupPorUnidad: number;
    /** Billetes y monedas que se aceptan, del mayor al menor. */
    denominaciones: number[];
    /** Solo en la pantalla: billetes de CUP de siempre, usados cuando el servidor no informó las monedas. */
    respaldo?: boolean;
}

/** GET /venta/parametros */
export interface ParametrosVenta {
    /** Impuesto sobre ventas vigente, en %. */
    impuestoPorciento: number;
    /** Descuento máximo por línea que puede dar el usuario actual, en %. */
    descuentoMaximoPct: number;
    /** Tasa con la que se convierten las monedas (si el servidor la informa). */
    tipoTasa?: TipoTasa;
    /** Monedas con las que se puede cobrar efectivo. Vacío = solo CUP con los billetes de siempre. */
    monedas: MonedaCobro[];
}

// ═══════════════════════════════════════════════════════════════
// NOMENCLADORES QUE USAN LOS DIÁLOGOS DE PAGO
// ═══════════════════════════════════════════════════════════════

/** GET /banco */
export interface BancoPago {
    _id: string;
    codigo: string;
    nombre: string;
    activo: boolean;
}

/** GET /canal-pago */
export interface CanalPagoInfo {
    codigo: CanalTransferencia;
    nombre: string;
    /** Moneda en la que se paga por este canal si no se elige otra (Zelle: USD). */
    monedaPorDefecto: string;
    /** El cobro debe llevar un banco del nomenclador. */
    requiereBanco: boolean;
}
