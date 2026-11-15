import { BASE_URL } from './apiConfig';
import { authFetch } from './httpClient';
import type { ActualizarFacturaDto, CrearFacturaDto, Factura } from '../types/factura.types';

/** Error de la API de facturas con el estado HTTP, para poder explicar mejor un 403 o un 409. */
export class ErrorFacturaApi extends Error {
    readonly status: number;

    constructor(mensaje: string, status: number) {
        super(mensaje);
        this.name = 'ErrorFacturaApi';
        this.status = status;
    }
}

const MENSAJE_SIN_PERMISO = 'Su rol no tiene permiso para realizar esta acción.';

function mensajeDe(datos: unknown, estado: number): string {
    const mensaje =
        datos && typeof datos === 'object' && 'message' in datos
            ? (datos as { message: string | string[] }).message
            : typeof datos === 'string' && datos
              ? datos
              : null;
    const texto = Array.isArray(mensaje) ? mensaje.join('. ') : mensaje;
    // Nest responde "Forbidden resource" (en inglés) cuando el rol no está autorizado.
    if (estado === 403 && (!texto || /^forbidden/i.test(texto))) return MENSAJE_SIN_PERMISO;
    return texto || `Error HTTP ${estado}`;
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const headers = new Headers(opciones.headers);
    headers.set('Accept', 'application/json');
    if (opciones.body !== undefined) headers.set('Content-Type', 'application/json');

    const respuesta = await authFetch(`${BASE_URL}${ruta}`, { ...opciones, headers });
    const texto = await respuesta.text();
    let datos: unknown = null;
    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }
    if (!respuesta.ok) throw new ErrorFacturaApi(mensajeDe(datos, respuesta.status), respuesta.status);
    return datos as T;
}

/** Texto para mostrar al usuario cuando una acción sobre facturas falla. */
export function mensajeErrorFactura(error: unknown): string {
    return error instanceof Error && error.message ? error.message : 'No se pudo completar la acción.';
}

const rutaFactura = (id: string): string => `/facturas/${encodeURIComponent(id)}`;

const patch = <T>(ruta: string, cuerpo?: unknown): Promise<T> =>
    solicitar<T>(ruta, { method: 'PATCH', body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });

export const FacturaApi = {
    /** Más recientes primero. El servidor devuelve la página como arreglo, sin total. */
    listar(pagina = 1, limite = 100): Promise<Factura[]> {
        return solicitar<Factura[]>(`/facturas?page=${pagina}&limit=${limite}`);
    },

    obtener(id: string): Promise<Factura> {
        return solicitar<Factura>(rutaFactura(id));
    },

    crear(dto: CrearFacturaDto): Promise<Factura> {
        return solicitar<Factura>('/facturas', { method: 'POST', body: JSON.stringify(dto) });
    },

    actualizar(id: string, dto: ActualizarFacturaDto): Promise<Factura> {
        return patch<Factura>(rutaFactura(id), dto);
    },

    /** edicion -> terminada */
    terminar(id: string): Promise<Factura> {
        return patch<Factura>(`${rutaFactura(id)}/terminar`);
    },

    /** terminada -> edicion */
    volverAEdicion(id: string): Promise<Factura> {
        return patch<Factura>(`${rutaFactura(id)}/editar`);
    },

    /** terminada -> confirmada (descuenta el stock en el servidor) */
    confirmar(id: string): Promise<Factura> {
        return patch<Factura>(`${rutaFactura(id)}/confirmar`);
    },

    /** confirmada -> cancelada (revierte el stock). Solo administrador y gerente; exige motivo. */
    cancelar(id: string, motivo: string): Promise<Factura> {
        return patch<Factura>(`${rutaFactura(id)}/cancelar`, { motivo });
    },

    /** edicion o terminada -> anulada. Solo administrador y gerente; exige motivo. */
    anular(id: string, motivo: string): Promise<Factura> {
        return patch<Factura>(`${rutaFactura(id)}/anular`, { motivo });
    },

    /** DELETE es una baja blanda (anula la factura); exige `?motivo=`. Solo administrador y gerente. */
    eliminar(id: string, motivo: string): Promise<Factura> {
        return solicitar<Factura>(`${rutaFactura(id)}?motivo=${encodeURIComponent(motivo)}`, { method: 'DELETE' });
    },
};
