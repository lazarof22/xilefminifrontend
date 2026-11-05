import { BASE_URL } from './apiConfig';
import { avisarSesionExpirada, obtenerToken } from '../utils/auth';

/**
 * fetch contra el backend: añade el token (si hay sesión), serializa el body
 * como JSON y convierte los errores de NestJS en `Error` con su mensaje.
 */
export async function apiRequest<T>(
    ruta: string,
    opciones: RequestInit = {},
    /**
     * Para llamadas que llevan en el cuerpo credenciales o autorizaciones de OTRA persona (p. ej. un
     * supervisor): un 401 por ellas no es la sesión del cajero vencida, así que no se cierra su sesión.
     */
    { cerrarSesionEn401 = true }: { cerrarSesionEn401?: boolean } = {},
): Promise<T> {
    const headers = new Headers(opciones.headers);
    headers.set('Accept', 'application/json');
    if (opciones.body !== undefined) headers.set('Content-Type', 'application/json');
    const token = obtenerToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const respuesta = await fetch(`${BASE_URL}${ruta}`, { ...opciones, headers });
    const texto = await respuesta.text();
    let datos: unknown = null;
    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }

    if (!respuesta.ok) {
        // 401 con sesión iniciada: el token venció o es inválido, se cierra la sesión.
        if (respuesta.status === 401 && token && cerrarSesionEn401) avisarSesionExpirada();
        const mensaje =
            datos && typeof datos === 'object' && 'message' in datos
                ? (datos as { message: string | string[] }).message
                : null;
        throw new Error(
            Array.isArray(mensaje) ? mensaje.join('. ') : mensaje || `Error HTTP ${respuesta.status}`,
        );
    }
    return datos as T;
}

/**
 * `fetch` que añade el token de la sesión (si hay) y conserva el resto del
 * comportamiento: devuelve la `Response` tal cual para que quien llama siga
 * leyendo `response.ok`, `status` y el cuerpo como antes.
 */
export function authFetch(entrada: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = obtenerToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return fetch(entrada, { ...init, headers }).then((respuesta) => {
        if (respuesta.status === 401 && token) avisarSesionExpirada();
        return respuesta;
    });
}

/** Fecha local de hoy en formato AAAA-MM-DD. */
export function fechaHoyLocal(): string {
    const hoy = new Date();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${m}-${d}`;
}
