import {
    AuthApiError,
    type CredencialesLogin,
    type RespuestaLogin,
    type UsuarioSesion,
} from '../types/auth.types';
import { BASE_URL } from './apiConfig';
import { cabecerasAuth } from '../utils/auth';

// ═══ Helpers privados ═══

function esUsuarioSesion(valor: unknown): valor is UsuarioSesion {
    if (typeof valor !== 'object' || valor === null) return false;
    const u = valor as Record<string, unknown>;
    return (
        typeof u.id === 'string' &&
        typeof u.nombre === 'string' &&
        typeof u.rol === 'string' &&
        Array.isArray(u.modulos)
    );
}

function esRespuestaLogin(valor: unknown): valor is RespuestaLogin {
    if (typeof valor !== 'object' || valor === null) return false;
    const r = valor as Record<string, unknown>;
    return typeof r.access_token === 'string' && r.access_token !== '' && esUsuarioSesion(r.usuario);
}

async function leerJson(respuesta: Response): Promise<unknown> {
    try {
        return await respuesta.json();
    } catch {
        return null;
    }
}

/** Mensaje de NestJS (`message` string o lista) si existe. */
function mensajeDelServidor(cuerpo: unknown): string | undefined {
    if (typeof cuerpo !== 'object' || cuerpo === null) return undefined;
    const m = (cuerpo as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join('. ');
    return undefined;
}

async function pedir(url: string, init: RequestInit): Promise<Response> {
    try {
        return await fetch(url, init);
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        throw new AuthApiError(0, 'No se pudo conectar con el servidor');
    }
}

// ═══ API pública ═══

export const authApi = {
    async login(credenciales: CredencialesLogin, signal?: AbortSignal): Promise<RespuestaLogin> {
        const respuesta = await pedir(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(credenciales),
            signal,
        });

        if (respuesta.status === 401) throw new AuthApiError(401, 'Usuario o contraseña incorrectos');
        if (respuesta.status === 429) {
            throw new AuthApiError(429, 'Demasiados intentos. Espere un minuto e inténtelo de nuevo');
        }

        const cuerpo = await leerJson(respuesta);
        if (!respuesta.ok) {
            throw new AuthApiError(
                respuesta.status,
                mensajeDelServidor(cuerpo) ?? `Error ${respuesta.status} al iniciar sesión`,
            );
        }
        if (!esRespuestaLogin(cuerpo)) {
            throw new AuthApiError(respuesta.status, 'Respuesta de inicio de sesión inválida');
        }
        return cuerpo;
    },

    /** Usuario de la sesión con rol y módulos al día (el servidor los lee de la base de datos). */
    async perfil(signal?: AbortSignal): Promise<UsuarioSesion> {
        const respuesta = await pedir(`${BASE_URL}/auth/perfil`, {
            headers: { Accept: 'application/json', ...cabecerasAuth() },
            signal,
        });
        if (respuesta.status === 401 || respuesta.status === 404) {
            throw new AuthApiError(401, 'La sesión ha expirado');
        }
        const cuerpo = await leerJson(respuesta);
        if (!respuesta.ok || !esUsuarioSesion(cuerpo)) {
            throw new AuthApiError(respuesta.status, 'No se pudo verificar la sesión');
        }
        return cuerpo;
    },
};
