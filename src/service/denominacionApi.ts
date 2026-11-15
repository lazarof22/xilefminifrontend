import { apiRequest } from './httpClient';

export type TipoDenominacion = 'billete' | 'moneda';

export const ETIQUETA_TIPO_DENOMINACION: Record<TipoDenominacion, string> = {
    billete: 'Billete',
    moneda: 'Moneda',
};

/** Billete o moneda de una divisa (GET /denominacion-moneda). */
export interface Denominacion {
    _id: string;
    /** Código de la moneda: CUP, USD, EUR... */
    moneda: string;
    /** Valor facial, hasta 2 decimales. */
    valor: number;
    tipo: TipoDenominacion;
    /** Una denominación inactiva deja de ofrecerse y de aceptarse en los cobros nuevos. */
    activa: boolean;
}

export interface CrearDenominacionDto {
    moneda: string;
    valor: number;
    tipo?: TipoDenominacion;
    activa?: boolean;
}

export type ActualizarDenominacionDto = Partial<CrearDenominacionDto>;

export const denominacionApi = {
    /** Del mayor al menor valor; con `moneda` solo las de esa divisa. */
    listar: (moneda?: string) =>
        apiRequest<Denominacion[]>(`/denominacion-moneda${moneda ? `?moneda=${encodeURIComponent(moneda)}` : ''}`),
    crear: (dto: CrearDenominacionDto) =>
        apiRequest<Denominacion>('/denominacion-moneda', { method: 'POST', body: JSON.stringify(dto) }),
    actualizar: (id: string, dto: ActualizarDenominacionDto) =>
        apiRequest<Denominacion>(`/denominacion-moneda/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
};
