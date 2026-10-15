import type {
    ActualizarUsuarioDto,
    NuevoUsuarioDto,
    UsuarioBackend,
} from '../types/usuarios.types';
import { BASE_URL } from './apiConfig';
import { avisarSesionExpirada, cabecerasAuth } from '../utils/auth';

/** Error con el mensaje que devolvió el servidor (NestJS `message`). */
export class UsuariosApiError extends Error {
    readonly status: number;

    constructor(status: number, mensaje: string) {
        super(mensaje);
        this.name = 'UsuariosApiError';
        this.status = status;
    }
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
    let respuesta: Response;
    try {
        respuesta = await fetch(`${BASE_URL}${ruta}`, {
            ...init,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...cabecerasAuth(),
                ...(init.headers as Record<string, string> | undefined),
            },
        });
    } catch {
        throw new UsuariosApiError(0, 'No se pudo conectar con el servidor. Verifique su conexión.');
    }

    const cuerpo: unknown = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        if (respuesta.status === 401) avisarSesionExpirada();
        const m = (cuerpo as { message?: unknown } | null)?.message;
        const texto = Array.isArray(m) ? m.join('. ') : typeof m === 'string' ? m : undefined;
        throw new UsuariosApiError(
            respuesta.status,
            respuesta.status === 403
                ? 'No tiene permisos para gestionar usuarios (se requiere el rol administrador)'
                : (texto ?? `Error ${respuesta.status}`),
        );
    }
    return cuerpo as T;
}

export const usuariosApi = {
    getAll: () => pedir<UsuarioBackend[]>('/usuarios'),

    crear: (dto: NuevoUsuarioDto) =>
        pedir<UsuarioBackend>('/usuarios', { method: 'POST', body: JSON.stringify(dto) }),

    actualizar: (id: string, dto: ActualizarUsuarioDto) =>
        pedir<UsuarioBackend>(`/usuarios/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(dto),
        }),

    eliminar: (id: string) =>
        pedir<{ deleted: boolean }>(`/usuarios/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
