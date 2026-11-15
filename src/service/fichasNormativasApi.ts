import { apiRequest } from './httpClient';

/** Regla de numeración de un tipo de documento. */
export interface NumeracionFicha {
    /** Prefijo del consecutivo; `null` si el documento no tiene secuencia propia. */
    prefijo: string | null;
    /** Descripción legible de la regla. */
    formato: string;
    /** Número de ejemplo; `null` si no hay secuencia propia. */
    ejemplo: string | null;
}

/** Ficha normativa de un documento que produce el sistema (GET /configuracion/fichas-normativas). */
export interface FichaNormativa {
    /** Código oficial del formulario, p. ej. SC-2-04. */
    codigo: string;
    nombre: string;
    norma: string;
    camposObligatorios: string[];
    numeracion: NumeracionFicha;
    /** Campos que llevan la firma o los responsables del documento. */
    firmas: string[];
    moduloApi: string;
}

export const fichasNormativasApi = {
    listar: () => apiRequest<FichaNormativa[]>('/configuracion/fichas-normativas'),
};
