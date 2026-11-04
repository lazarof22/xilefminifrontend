import { apiRequest } from './httpClient';

/** Evento de ventana que avisa a otras pantallas (cuadre, arqueo) de que el turno cambió. */
export const EVENTO_TURNO_CAJA = 'turno-caja:cambio';

/** Montos por moneda: la clave es el código de la moneda (CUP, USD...). */
export type MontosPorMoneda = Record<string, number>;

export type EstadoTurnoCaja = 'abierto' | 'cerrado';

export interface TurnoCaja {
    _id: string;
    cajeroId: string;
    cajeroNombre?: string;
    fechaApertura: string;
    fechaCierre?: string;
    fondoInicial: MontosPorMoneda;
    estado: EstadoTurnoCaja;
    cuadre?: string;
    arqueo?: string;
    observacionesCierre?: string;
}

export interface AbrirTurnoCajaDto {
    fondoInicial: MontosPorMoneda;
}

/** Turno abierto del usuario autenticado, o `null` si no tiene ninguno. */
export const obtenerTurnoAbierto = async (): Promise<TurnoCaja | null> =>
    (await apiRequest<TurnoCaja | null>('/turno-caja/abierto')) ?? null;

export const abrirTurnoCaja = (dto: AbrirTurnoCajaDto) =>
    apiRequest<TurnoCaja>('/turno-caja', { method: 'POST', body: JSON.stringify(dto) });

export const cerrarTurnoCaja = (id: string, observaciones?: string) =>
    apiRequest<TurnoCaja>(`/turno-caja/${encodeURIComponent(id)}/cerrar`, {
        method: 'PATCH',
        body: JSON.stringify(observaciones ? { observaciones } : {}),
    });

export const listarTurnosCaja = (filtros: { estado?: EstadoTurnoCaja; cajeroId?: string } = {}) => {
    const q = new URLSearchParams();
    if (filtros.estado) q.set('estado', filtros.estado);
    if (filtros.cajeroId) q.set('cajeroId', filtros.cajeroId);
    const qs = q.toString();
    return apiRequest<TurnoCaja[]>(`/turno-caja${qs ? `?${qs}` : ''}`);
};

/** "1 000,00 CUP · 20,00 USD": una cifra por moneda, nunca sumadas. */
export const formatearPorMoneda = (montos: MontosPorMoneda | undefined, soloConValor = false): string => {
    const partes = Object.entries(montos ?? {})
        .filter(([, v]) => !soloConValor || v !== 0)
        .map(
            ([moneda, v]) =>
                `${v.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`,
        );
    return partes.length > 0 ? partes.join(' · ') : '0,00 CUP';
};
