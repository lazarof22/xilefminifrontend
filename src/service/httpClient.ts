import { BASE_URL } from './apiConfig';
import { obtenerToken } from '../utils/auth';

/**
 * fetch contra el backend: añade el token (si hay sesión), serializa el body
 * como JSON y convierte los errores de NestJS en `Error` con su mensaje.
 */
export async function apiRequest<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
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

/** Fecha local de hoy en formato AAAA-MM-DD. */
export function fechaHoyLocal(): string {
    const hoy = new Date();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${m}-${d}`;
}
