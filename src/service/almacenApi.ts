import { apiRequest } from './httpClient';

export interface Almacen {
    _id?: string;
    codigoAlmacen: string;
    nombreAlmacen: string;
    cantidadContenedores: number;
    /** Dirección del almacén (opcional). */
    direccion?: string;
}

export interface CreateAlmacenDto {
    codigoAlmacen: string;
    nombreAlmacen: string;
    cantidadContenedores: number;
    direccion?: string;
}

export interface Contenedor {
    _id?: string;

    codigoContenedor: string;

    nombreContenedor: string;

    almacen:
        | string
        | {
              _id: string;
              codigoAlmacen?: string;
              nombreAlmacen?: string;
          };

    productosCount?: number;

    /** Ubicación física dentro del almacén (opcionales). */
    seccion?: string;
    estante?: string;
    casilla?: string;
}

export interface CreateContenedorDto {
    codigoContenedor: string;
    nombreContenedor: string;
    almacen: string;
    seccion?: string;
    estante?: string;
    casilla?: string;
}

export const AlmacenApi = {
    listar(): Promise<Almacen[]> {
        return apiRequest<Almacen[]>('/almacen');
    },

    crear(dto: CreateAlmacenDto): Promise<Almacen> {
        return apiRequest<Almacen>('/almacen', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },

    listarContenedores(): Promise<Contenedor[]> {
        return apiRequest<Contenedor[]>('/contenedor');
    },

    crearContenedor(dto: CreateContenedorDto): Promise<Contenedor> {
        return apiRequest<Contenedor>('/contenedor', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },

    async eliminarContenedor(id: string): Promise<void> {
        await apiRequest<unknown>(`/contenedor/${id}`, { method: 'DELETE' });
    },
};
