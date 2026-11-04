import { apiRequest } from './httpClient';

/** Roles que pueden autorizar una extracción de caja (doc §6.9). */
export const ROLES_AUTORIZADORES_EXTRACCION = ['administrador', 'gerente'] as const;

export const MENSAJE_SOLO_SUPERVISOR =
    'Solo un administrador o gerente puede autorizar una extracción de caja';

export const puedeAutorizarExtraccion = (rol: string | undefined): boolean =>
    rol !== undefined && (ROLES_AUTORIZADORES_EXTRACCION as readonly string[]).includes(rol);

export interface CrearExtraccionDto {
    monto: number;
    causa: string;
    moneda?: string;
    responsable?: string;
    /** Token de acceso del supervisor; no hace falta si quien extrae ya es administrador o gerente. */
    tokenAutorizador?: string;
}

export interface ExtraccionBackend {
    _id: string;
    monto: number;
    causa: string;
    fecha: string;
    moneda?: string;
    autorizadoPor?: { usuarioId: string; nombre: string };
}

export const crearExtraccion = (dto: CrearExtraccionDto) =>
    apiRequest<ExtraccionBackend>('/extraccion', { method: 'POST', body: JSON.stringify(dto) });

// ─── Autorización del supervisor (solo en memoria) ─────────────────────
// El diálogo de login del supervisor y el de extracción son componentes
// hermanos; el token pasa de uno a otro por aquí. Nunca se escribe en
// localStorage/sessionStorage ni reemplaza la sesión del cajero, y se
// consume una sola vez.

let tokenSupervisor: string | null = null;

export const guardarAutorizacionExtraccion = (token: string): void => {
    tokenSupervisor = token;
};

/** Token del supervisor, sin olvidarlo: permite reintentar si el servidor rechaza datos. */
export const leerAutorizacionExtraccion = (): string | null => tokenSupervisor;

export const descartarAutorizacionExtraccion = (): void => {
    tokenSupervisor = null;
};
