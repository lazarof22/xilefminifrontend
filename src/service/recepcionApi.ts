import { apiRequest } from './httpClient';

// ═══ Informe de Recepción SC-2-04 ═══
// El borrador no mueve el inventario; el saldo se actualiza al registrar.

export type EstadoRecepcion = 'borrador' | 'registrada';
export type TipoDocumentoOrigen = 'factura' | 'conduce' | 'otro';

export interface DocumentoOrigen {
    tipo: TipoDocumentoOrigen;
    numero: string;
    /** Fecha ISO. */
    fecha: string;
}

export interface LineaRecepcion {
    producto: string;
    contenedor: string;
    cantidad: number;
    costo_unitario: number;
    /** cantidad × costo_unitario, calculado por el servidor. */
    total: number;
}

export interface Recepcion {
    _id: string;
    numeroConsecutivo: string;
    fechaEmision: string;
    entidadReceptora: { codigo: string; nombre: string };
    almacenReceptor: string;
    proveedor: string;
    documentoOrigen: DocumentoOrigen;
    transportista?: string;
    lineas: LineaRecepcion[];
    /** Suma de las líneas, calculada por el servidor. */
    total: number;
    responsableRecepcion: string;
    responsableComprobacion: string;
    estado: EstadoRecepcion;
    inventarioAplicado: boolean;
    fechaRegistro?: string;
    registradoPor?: string;
    createdAt?: string;
}

export interface CrearLineaRecepcionDto {
    producto: string;
    contenedor: string;
    cantidad: number;
    costo_unitario: number;
}

export interface CrearRecepcionDto {
    /** AAAA-MM-DD; por defecto, hoy. */
    fechaEmision?: string;
    almacenReceptor: string;
    proveedor: string;
    documentoOrigen: { tipo: TipoDocumentoOrigen; numero: string; fecha: string };
    transportista?: string;
    responsableComprobacion: string;
    lineas: CrearLineaRecepcionDto[];
}

export type ActualizarRecepcionDto = Partial<CrearRecepcionDto>;

export const recepcionApi = {
    listar(estado?: EstadoRecepcion): Promise<Recepcion[]> {
        const query = estado ? `?estado=${encodeURIComponent(estado)}` : '';
        return apiRequest<Recepcion[]>(`/recepcion${query}`);
    },

    obtener(id: string): Promise<Recepcion> {
        return apiRequest<Recepcion>(`/recepcion/${encodeURIComponent(id)}`);
    },

    /** Crea el borrador (no mueve stock). */
    crear(dto: CrearRecepcionDto): Promise<Recepcion> {
        return apiRequest<Recepcion>('/recepcion', { method: 'POST', body: JSON.stringify(dto) });
    },

    /** Edita un borrador; una recepción registrada responde 409. */
    actualizar(id: string, dto: ActualizarRecepcionDto): Promise<Recepcion> {
        return apiRequest<Recepcion>(`/recepcion/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(dto),
        });
    },

    /** Aplica el saldo del inventario una sola vez (un segundo intento responde 409). */
    registrar(id: string): Promise<Recepcion> {
        return apiRequest<Recepcion>(`/recepcion/${encodeURIComponent(id)}/registrar`, { method: 'POST' });
    },
};
