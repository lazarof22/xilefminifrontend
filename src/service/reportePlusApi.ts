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

export interface ResumenReportePlus {
    desde: string;
    totalVentas: number;
    totalExtracciones: number;
    saldoNeto: number;
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
