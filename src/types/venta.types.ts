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

/** Cómo paga el cliente. No lleva importes: el efectivo recibido sale de sumar el desglose. */
export type PagoCheckout =
    | {
          tipo: 'efectivo';
          desglose: Partial<DesgloseBilletes>;
          tipoCliente?: TipoClientePago;
          datosClienteDescuento?: DatosClienteDescuento;
      }
    | { tipo: 'credito' }
    | {
          tipo: 'transferencia';
          numeroCuenta: string;
          banco: string;
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
        total: number;
    };
    pago: {
        _id: string;
        tipo: string;
        montoRecibido: number;
        cambio: number;
        esCuentaCasa: boolean;
    };
    cambio: number;
    comprobante: string;
    advertencias: string[];
    idempotencia: {
        clave: string;
        estado: 'completada';
        repetida: boolean;
    };
}

/** GET /venta/parametros */
export interface ParametrosVenta {
    /** Impuesto sobre ventas vigente, en %. */
    impuestoPorciento: number;
    /** Descuento máximo por línea que puede dar el usuario actual, en %. */
    descuentoMaximoPct: number;
}
