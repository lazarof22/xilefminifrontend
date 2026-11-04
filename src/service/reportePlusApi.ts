import { apiRequest } from './httpClient';

export type MetodoPagoReporte = 'efectivo' | 'credito' | 'transferencia' | 'factura';

/** Una fila por producto vendido en el turno actual. */
export interface FilaReportePlus {
    _id: string;
    fecha: string;
    producto: { codigo: string; nombre: string };
    cantidadVendida: number;
    stockFinal: number;
    metodoPago: MetodoPagoReporte;
    total: number;
    descuento: number;
    impuesto: number;
}

export type TotalesPorMetodo = Record<MetodoPagoReporte, number>;

/** Cifras por moneda: la clave es el código de la moneda (CUP, USD...). */
export type CifrasPorMoneda = Record<string, number>;

export interface DetalleEfectivoMoneda {
    fondoInicial: number;
    efectivoRecibido: number;
    cambioEntregado: number;
    devolucionesEfectivo: number;
    extracciones: number;
    depositosBancarios: number;
    efectivoEsperado: number;
}

export interface ResumenReportePlus {
    desde: string;
    totalVentas: number;
    totalExtracciones: number;
    /**
     * @deprecated Mezcla efectivo, crédito y transferencia en un solo saldo.
     * Usar `efectivoEsperado`, `cuentasPorCobrar` y `cobrosElectronicos`.
     */
    saldoNeto: number;
    /** Efectivo físico esperado en caja, por moneda (fondo + entradas - salidas). */
    efectivoEsperado: CifrasPorMoneda;
    /** Ventas a crédito menos cobros aplicados, por moneda. */
    cuentasPorCobrar: CifrasPorMoneda;
    /** Transferencias, por moneda. */
    cobrosElectronicos: CifrasPorMoneda;
    /** Líneas de factura (no es un medio de cobro), por moneda; informativo. */
    facturado: CifrasPorMoneda;
    detalleEfectivo: Record<string, DetalleEfectivoMoneda>;
    cantidadTransferencias: number;
    porMetodo: TotalesPorMetodo;
    movimientos: number;
}

export interface CierreTurnoResultado {
    mensaje: string;
    movimientosKardex: number;
    filasEliminadas: number;
    resumen: ResumenReportePlus;
}

export const listarReportePlus = () => apiRequest<FilaReportePlus[]>('/reporte-plus');

export const obtenerResumenReportePlus = () =>
    apiRequest<ResumenReportePlus>('/reporte-plus/resumen');

export const cerrarTurno = () =>
    apiRequest<CierreTurnoResultado>('/reporte-plus/cerrar-turno', { method: 'POST' });
