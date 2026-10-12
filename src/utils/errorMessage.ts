// src/utils/errorMessage.ts

const SIN_CONEXION = 'No se pudo conectar con el servidor. Verifique su conexión.';

/** Errores que lanzan axios y fetch cuando no hay respuesta del servidor. */
const MENSAJES_DE_RED = ['network error', 'failed to fetch', 'load failed', 'networkerror'];

function texto(valor: unknown): string | null {
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    if (Array.isArray(valor)) {
        const partes = valor.filter((v): v is string => typeof v === 'string' && !!v.trim());
        return partes.length > 0 ? partes.join('. ') : null;
    }
    return null;
}

/**
 * Convierte cualquier error en un texto para el usuario.
 * Entiende los errores de NestJS (`{ message: string | string[] }`, que es lo
 * que devuelve el ValidationPipe), los de axios (`error.response.data`), los
 * `Error` normales, los strings y la falta de conexión con el servidor.
 */
export function getErrorMessage(
    error: unknown,
    fallback = 'Ocurrió un error inesperado',
): string {
    if (error === null || error === undefined) return fallback;

    const directo = texto(error);
    if (directo) return directo;

    if (typeof error === 'object') {
        const e = error as {
            message?: unknown;
            code?: unknown;
            response?: { data?: unknown };
        };

        // axios: el cuerpo de la respuesta del backend
        const data = e.response?.data;
        if (typeof data === 'object' && data !== null) {
            const cuerpo = data as { message?: unknown; error?: unknown };
            const delBackend = texto(cuerpo.message) ?? texto(cuerpo.error);
            if (delBackend) return delBackend;
        } else {
            const delBackend = texto(data);
            if (delBackend && !delBackend.startsWith('<')) return delBackend; // no volcar HTML
        }

        if (e.code === 'ERR_NETWORK') return SIN_CONEXION;

        // El servidor respondió con un error pero sin mensaje utilizable: es mejor el texto
        // por defecto de quien llama que "Request failed with status code 500".
        if (e.response) return fallback;

        const mensaje = texto(e.message);
        if (mensaje) {
            return MENSAJES_DE_RED.includes(mensaje.toLowerCase()) ? SIN_CONEXION : mensaje;
        }
    }

    return fallback;
}
