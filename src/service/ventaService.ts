// src/services/ventaService.ts
import type {
    CreateVentaDto,
    VentaResponse,
    ProcesamientoVenta,
    DesgloseBilletes,
    ProductoCarrito,
} from '../types/venta.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ───────────────────────────────────────────────────────────────
// ERROR HANDLER
// ───────────────────────────────────────────────────────────────
const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.message || errorData.error || `Error ${response.status}: ${response.statusText}`;
        throw new Error(message);
    }
    return response.json();
};

// ═══════════════════════════════════════════════════════════════
// 1. CREAR PAGO EN EFECTIVO (POST /pago/efectivo)
// ═══════════════════════════════════════════════════════════════
export interface CreatePagoEfectivoDto {
    desglose: DesgloseBilletes;
    monto_pagado: number;   // Total del desglose
    monto_pagar: number;    // Monto de la venta
    cambio: number;
}

export const crearPagoEfectivo = async (dto: CreatePagoEfectivoDto): Promise<any> => {
    const response = await fetch(`${API_URL}/pago/pagoEfectivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    return handleResponse<any>(response);
};

// ═══════════════════════════════════════════════════════════════
// 2. CREAR PAGO A CRÉDITO (POST /pago/credito)
// ═══════════════════════════════════════════════════════════════
export interface CreatePagoCreditoDto {
    monto_pagar: number;
    clienteId: string;      // MongoDB ObjectId del cliente
}

export const crearPagoCredito = async (dto: CreatePagoCreditoDto): Promise<any> => {
    const response = await fetch(`${API_URL}/pago/pagoCredito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    return handleResponse<any>(response);
};

// ═══════════════════════════════════════════════════════════════
// 3. CREAR PAGO POR TRANSFERENCIA (POST /pago/transferencia)
// ═══════════════════════════════════════════════════════════════
export interface CreatePagoTransferenciaDto {
    monto_pagado: number;
    ciCliente: string;
    nombreCliente: string;
    referenciaPago: string;
}

export const crearPagoTransferencia = async (dto: CreatePagoTransferenciaDto): Promise<any> => {
    const response = await fetch(`${API_URL}/pago/pagoTransferencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
    });
    return handleResponse<any>(response);
};

// ═══════════════════════════════════════════════════════════════
// 4. CREAR VENTA (POST /venta)
// ═══════════════════════════════════════════════════════════════
export const crearVenta = async (ventaDto: CreateVentaDto): Promise<VentaResponse> => {
    const response = await fetch(`${API_URL}/venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ventaDto),
    });
    return handleResponse<VentaResponse>(response);
};

// ═══════════════════════════════════════════════════════════════
// 5. PROCESAR VENTA COMPLETA — EFECTIVO
// ═══════════════════════════════════════════════════════════════
export interface ProcesarVentaEfectivoParams {
    desglose: DesgloseBilletes;
    montoPagado: number;    // Total del desglose
    montoPagar: number;     // Monto de la venta
    cambio: number;
    clienteIdVenta: string;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
}

export const procesarVentaEfectivo = async (
    params: ProcesarVentaEfectivoParams
): Promise<ProcesamientoVenta> => {
    try {
        // ── PASO 1: Crear Pago Efectivo ────────────────────────
        const pagoDto: CreatePagoEfectivoDto = {
            desglose: params.desglose,
            monto_pagado: params.montoPagado,
            monto_pagar: params.montoPagar,
            cambio: params.cambio,
        };

        const pagoCreado = await crearPagoEfectivo(pagoDto);

        // ── PASO 2: Preparar items de venta ───────────────────
        const itemsVenta = params.productosCarrito.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad,
            descuentoMonto: item.precio * item.cantidad * (item.descuento / 100),
        }));

        // ── PASO 3: Crear la Venta ─────────────────────────────
        const ventaDto: CreateVentaDto = {
            clienteId: params.clienteIdVenta,
            productos: itemsVenta,
            subtotal_venta: params.subtotal,
            descuento_total: params.descuentoTotal,
            impuesto: params.impuesto,
            pago: pagoCreado._id,
        };

        const ventaCreada = await crearVenta(ventaDto);

        return {
            exito: true,
            mensaje: 'Venta en efectivo procesada exitosamente',
            venta: ventaCreada,
            pago: pagoCreado,
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error al procesar venta en efectivo';
        return { exito: false, mensaje };
    }
};

// ═══════════════════════════════════════════════════════════════
// 6. PROCESAR VENTA COMPLETA — CRÉDITO
// ═══════════════════════════════════════════════════════════════
export interface ProcesarVentaCreditoParams {
    montoPagar: number;
    clienteId: string;       // MongoDB ObjectId
    clienteIdVenta: string;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
}

export const procesarVentaCredito = async (
    params: ProcesarVentaCreditoParams
): Promise<ProcesamientoVenta> => {
    try {
        // ── PASO 1: Crear Pago Crédito ─────────────────────────
        const pagoDto: CreatePagoCreditoDto = {
            monto_pagar: params.montoPagar,
            clienteId: params.clienteId,
        };

        const pagoCreado = await crearPagoCredito(pagoDto);

        // ── PASO 2: Preparar items de venta ───────────────────
        const itemsVenta = params.productosCarrito.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad,
            descuentoMonto: item.precio * item.cantidad * (item.descuento / 100),
        }));

        // ── PASO 3: Crear la Venta ─────────────────────────────
        const ventaDto: CreateVentaDto = {
            clienteId: params.clienteIdVenta,
            productos: itemsVenta,
            subtotal_venta: params.subtotal,
            descuento_total: params.descuentoTotal,
            impuesto: params.impuesto,
            pago: pagoCreado._id,
        };

        const ventaCreada = await crearVenta(ventaDto);

        return {
            exito: true,
            mensaje: 'Venta a crédito procesada exitosamente',
            venta: ventaCreada,
            pago: pagoCreado,
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error al procesar venta a crédito';
        return { exito: false, mensaje };
    }
};

// ═══════════════════════════════════════════════════════════════
// 7. PROCESAR VENTA COMPLETA — TRANSFERENCIA
// ═══════════════════════════════════════════════════════════════
export interface ProcesarVentaTransferenciaParams {
    montoPagado: number;
    ciCliente: string;
    nombreCliente: string;
    referenciaPago: string;
    clienteIdVenta: string;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
}

export const procesarVentaTransferencia = async (
    params: ProcesarVentaTransferenciaParams
): Promise<ProcesamientoVenta> => {
    try {
        // ── PASO 1: Crear Pago Transferencia ───────────────────
        const pagoDto: CreatePagoTransferenciaDto = {
            monto_pagado: params.montoPagado,
            ciCliente: params.ciCliente,
            nombreCliente: params.nombreCliente,
            referenciaPago: params.referenciaPago,
        };

        const pagoCreado = await crearPagoTransferencia(pagoDto);

        // ── PASO 2: Preparar items de venta ───────────────────
        const itemsVenta = params.productosCarrito.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad,
            descuentoMonto: item.precio * item.cantidad * (item.descuento / 100),
        }));

        // ── PASO 3: Crear la Venta ─────────────────────────────
        const ventaDto: CreateVentaDto = {
            clienteId: params.clienteIdVenta,
            productos: itemsVenta,
            subtotal_venta: params.subtotal,
            descuento_total: params.descuentoTotal,
            impuesto: params.impuesto,
            pago: pagoCreado._id,
        };

        const ventaCreada = await crearVenta(ventaDto);

        return {
            exito: true,
            mensaje: 'Venta por transferencia procesada exitosamente',
            venta: ventaCreada,
            pago: pagoCreado,
        };

    } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error al procesar venta por transferencia';
        return { exito: false, mensaje };
    }
};

// ───────────────────────────────────────────────────────────────
// 8. HELPERS: Convertir datos del frontend al formato DTO
// ───────────────────────────────────────────────────────────────

/**
 * Convierte el desglose de billetes del dialog al formato del backend
 */
export const convertirDesgloseBilletes = (
    pagoData: Record<string, string>
): DesgloseBilletes => ({
    billete5000: parseInt(pagoData['billestes_5000'] || '0'),
    billete2000: parseInt(pagoData['billetes_2000'] || '0'),
    billete1000: parseInt(pagoData['billetes_1000'] || '0'),
    billete500: parseInt(pagoData['billetes_500'] || '0'),
    billete200: parseInt(pagoData['billetes_200'] || '0'),
    billete100: parseInt(pagoData['billetes_100'] || '0'),
    billete50: parseInt(pagoData['billetes_50'] || '0'),
    billete20: parseInt(pagoData['billetes_20'] || '0'),
    billete10: parseInt(pagoData['billetes_10'] || '0'),
    billete5: parseInt(pagoData['billetes_5'] || '0'),
    billete3: parseInt(pagoData['billetes_3'] || '0'),
    billete1: parseInt(pagoData['billetes_1'] || '0'),
});

/**
 * Calcula el total de un desglose de billetes
 */
export const calcularTotalDesglose = (desglose: DesgloseBilletes): number => {
    return (
        (desglose.billete5000 || 0) * 5000 +
        (desglose.billete2000 || 0) * 2000 +
        (desglose.billete1000 || 0) * 1000 +
        (desglose.billete500 || 0) * 500 +
        (desglose.billete200 || 0) * 200 +
        (desglose.billete100 || 0) * 100 +
        (desglose.billete50 || 0) * 50 +
        (desglose.billete20 || 0) * 20 +
        (desglose.billete10 || 0) * 10 +
        (desglose.billete5 || 0) * 5 +
        (desglose.billete3 || 0) * 3 +
        (desglose.billete1 || 0) * 1
    );
};