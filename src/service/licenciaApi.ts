import {
    LicenciaApiError,
    type ArchivoDescargado,
    type ArtefactoLicencia,
    type CuerpoErrorApi,
    type EstadoLicencia,
    type EstadoPublico,
    type EstadoUsuario,
    type RespuestaActivacion,
    type SolicitudLicencia,
} from '../types/licencia.types';

// ═══ Configuración ═══

// El backend no usa prefijo global: las rutas cuelgan directamente de la base.
const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const NOMBRE_SOLICITUD_POR_DEFECTO = 'xilef-solicitud.req';

interface OpcionesRequest {
    method?: 'GET' | 'POST';
    body?: unknown;
    autenticado?: boolean;
    signal?: AbortSignal;
}

// ═══ Helpers privados ═══

function cabeceras(autenticado: boolean, conCuerpo: boolean): Headers {
    const headers = new Headers({ Accept: 'application/json' });
    if (conCuerpo) headers.set('Content-Type', 'application/json');
    if (autenticado) {
        const token = localStorage.getItem('token');
        if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
}

async function leerCuerpo(respuesta: Response): Promise<unknown> {
    const texto = await respuesta.text();
    if (!texto) return null;
    try {
        return JSON.parse(texto) as unknown;
    } catch {
        return texto;
    }
}

function aError(status: number, cuerpo: unknown): LicenciaApiError {
    if (cuerpo && typeof cuerpo === 'object') {
        const { message, codigo } = cuerpo as CuerpoErrorApi;
        const mensaje = Array.isArray(message)
            ? message.join('. ')
            : message ?? `Error ${status}`;
        return new LicenciaApiError(status, mensaje, codigo);
    }
    return new LicenciaApiError(
        status,
        typeof cuerpo === 'string' && cuerpo ? cuerpo : `Error ${status}`,
    );
}

async function ejecutar(ruta: string, opciones: OpcionesRequest): Promise<Response> {
    const { method = 'GET', body, autenticado = true, signal } = opciones;
    let respuesta: Response;
    try {
        respuesta = await fetch(`${BASE_URL}${ruta}`, {
            method,
            headers: cabeceras(autenticado, body !== undefined),
            body: body === undefined ? undefined : JSON.stringify(body),
            signal,
        });
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        throw new LicenciaApiError(0, 'No se pudo conectar con el servidor');
    }
    if (!respuesta.ok) throw aError(respuesta.status, await leerCuerpo(respuesta));
    return respuesta;
}

async function request<T>(ruta: string, opciones: OpcionesRequest = {}): Promise<T> {
    const respuesta = await ejecutar(ruta, opciones);
    return (await leerCuerpo(respuesta)) as T;
}

function nombreDesdeDisposition(disposition: string | null): string | null {
    if (!disposition) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8) return decodeURIComponent(utf8[1]);
    const simple = /filename="?([^";]+)"?/i.exec(disposition);
    return simple ? simple[1] : null;
}

function nombreDesdeSolicitud(texto: string): string {
    try {
        const { empresa_id } = JSON.parse(texto) as Partial<SolicitudLicencia>;
        return typeof empresa_id === 'string' && empresa_id
            ? `xilef-${empresa_id.replace(/[^\w-]/g, '_')}.req`
            : NOMBRE_SOLICITUD_POR_DEFECTO;
    } catch {
        return NOMBRE_SOLICITUD_POR_DEFECTO;
    }
}

// ═══ API pública ═══

export const licenciaApi = {
    estadoPublico(signal?: AbortSignal): Promise<EstadoPublico> {
        return request<EstadoPublico>('/licencia/public/estado', { autenticado: false, signal });
    },

    estado(signal?: AbortSignal): Promise<EstadoUsuario> {
        return request<EstadoUsuario>('/licencia/estado', { signal });
    },

    detalle(empresaId?: string, signal?: AbortSignal): Promise<EstadoLicencia | null> {
        const ruta = empresaId ? `/licencia/${encodeURIComponent(empresaId)}` : '/licencia';
        return request<EstadoLicencia | null>(ruta, { signal });
    },

    async descargarSolicitud(): Promise<ArchivoDescargado> {
        const respuesta = await ejecutar('/licencia/solicitud?descargar=true', {});
        const texto = await respuesta.text();
        const contenido = new Blob([texto], { type: 'application/json' });
        // Content-Disposition puede no estar expuesto por CORS: se reconstruye desde el JSON.
        const nombre =
            nombreDesdeDisposition(respuesta.headers.get('Content-Disposition')) ??
            nombreDesdeSolicitud(texto);
        return { nombre, contenido };
    },

    activar(artefacto: ArtefactoLicencia): Promise<RespuestaActivacion> {
        return request<RespuestaActivacion>('/licencia/activar', {
            method: 'POST',
            body: artefacto,
        });
    },
};
