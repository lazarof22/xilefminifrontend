// src/types/venta.types.ts
// Tipos para integración Punto de Venta ↔ Backend NestJS

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

// ─── Desglose de billetes ────────────────────────────────────
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

// ─── Item de venta (para el DTO) ─────────────────────────────
export interface ItemVentaDto {
    productoId: string;
    cantidad: number;
    descuentoMonto: number;
}

// ─── DTO: Crear Venta (POST /venta) ──────────────────────────
export interface CreateVentaDto {
    clienteId: string;
    productos: ItemVentaDto[];
    subtotal_venta: number;
    descuento_total: number;
    impuesto: number;
    pago: string;  // _id del pago creado
}

// ─── Respuesta del backend ───────────────────────────────────
export interface VentaResponse {
    _id: string;
    clienteId: string;
    clienteNombre?: string;
    productos: Array<{
        productoId: string;
        cantidad: number;
        descuentoMonto: number;
    }>;
    subtotal_venta: number;
    descuento_total: number;
    impuesto: number;
    pago: any;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Estado del procesamiento ────────────────────────────────
export interface ProcesamientoVenta {
    exito: boolean;
    mensaje: string;
    venta?: VentaResponse;
    pago?: any;
}