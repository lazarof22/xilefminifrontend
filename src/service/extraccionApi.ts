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
    /** Autorización de un solo uso del supervisor; no hace falta si quien extrae ya es administrador o gerente. */
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
    apiRequest<ExtraccionBackend>(
        '/extraccion',
        { method: 'POST', body: JSON.stringify(dto) },
        // Lleva la autorización de un supervisor: si se rechaza, la sesión del cajero sigue abierta.
        { cerrarSesionEn401: false },
    );

// ─── Autorización del supervisor (solo en memoria) ─────────────────────
// El administrador o gerente entrega sus credenciales al servidor y recibe una
// autorización propia de esta acción (vence en minutos, se usa una sola vez y
// solo vale para la sesión del cajero). Nunca se maneja la sesión del
// supervisor. El diálogo de login y el de extracción son componentes
// hermanos; la autorización pasa de uno a otro por aquí, sin escribirse en
// localStorage/sessionStorage.

export interface AutorizacionExtraccion {
    tokenAutorizador: string;
    autorizadoPor: string;
    venceEnSegundos: number;
}

export const solicitarAutorizacionExtraccion = (nombre: string, contraseña: string) =>
    apiRequest<AutorizacionExtraccion>(
        '/extraccion/autorizacion',
        { method: 'POST', body: JSON.stringify({ nombre, contraseña }) },
        // Credenciales del supervisor: equivocarse no debe cerrar la sesión del cajero.
        { cerrarSesionEn401: false },
    );

let tokenSupervisor: string | null = null;

export const guardarAutorizacionExtraccion = (token: string): void => {
    tokenSupervisor = token;
};

/** Autorización pendiente, sin olvidarla: permite reintentar si el servidor rechaza los datos del formulario. */
export const leerAutorizacionExtraccion = (): string | null => tokenSupervisor;

export const descartarAutorizacionExtraccion = (): void => {
    tokenSupervisor = null;
};
