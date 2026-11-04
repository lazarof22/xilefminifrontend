import { apiRequest } from './httpClient';
import type { MontosPorMoneda } from './turnoCajaApi';

export type EstadoDiferencia = 'cuadrado' | 'sobrante' | 'faltante';

export interface EfectivoArqueoMoneda {
    esperado: number;
    contado: number;
    denominaciones?: Record<string, number>;
}

export interface DiferenciaArqueoMoneda {
    monto: number;
    estado: EstadoDiferencia;
}

export interface ArqueoCaja {
    _id: string;
    turnoCajaId: string;
    responsableArqueo: string;
    responsableCustodia: string;
    efectivoContado: Record<string, EfectivoArqueoMoneda>;
    diferencia: Record<string, DiferenciaArqueoMoneda>;
    /** true cuando quien cuenta es el mismo cajero del turno. */
    mismoResponsableQueCajero: boolean;
    observaciones: string;
    firmadoPor: string;
    createdAt?: string;
}

export interface CrearArqueoDto {
    turnoCajaId: string;
    responsableArqueo: string;
    responsableCustodia: string;
    /** Efectivo contado por moneda; el esperado y la diferencia los calcula el servidor. */
    efectivoContado: Record<string, { contado: number; denominaciones?: Record<string, number> }>;
    observaciones: string;
    firmadoPor: string;
}

export interface DetalleEfectivoMoneda {
    fondoInicial: number;
    efectivoRecibido: number;
    cambioEntregado: number;
    devolucionesEfectivo: number;
    extracciones: number;
    depositosBancarios: number;
    efectivoEsperado: number;
}

export interface EsperadoTurno {
    efectivoEsperado: MontosPorMoneda;
    cuentasPorCobrar: MontosPorMoneda;
    cobrosElectronicos: MontosPorMoneda;
    facturado: MontosPorMoneda;
    detalleEfectivo: Record<string, DetalleEfectivoMoneda>;
}

export const obtenerEsperadoDelTurno = (turnoCajaId: string) =>
    apiRequest<EsperadoTurno>(`/arqueo-caja/esperado/${encodeURIComponent(turnoCajaId)}`);

export const crearArqueo = (dto: CrearArqueoDto) =>
    apiRequest<ArqueoCaja>('/arqueo-caja', { method: 'POST', body: JSON.stringify(dto) });

export const listarArqueos = (turnoCajaId?: string) =>
    apiRequest<ArqueoCaja[]>(
        turnoCajaId ? `/arqueo-caja?turnoCajaId=${encodeURIComponent(turnoCajaId)}` : '/arqueo-caja',
    );
