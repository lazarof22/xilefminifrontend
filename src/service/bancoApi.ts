import { apiRequest } from './httpClient';

/** Banco del nomenclador (GET /banco). */
export interface Banco {
    _id: string;
    /** Código corto único en mayúsculas: BPA, BANDEC, BM... */
    codigo: string;
    nombre: string;
    /** Patrones con los que empieza el número de las tarjetas: dígitos y `?` (cualquier dígito). */
    prefijosTarjeta: string[];
    activo: boolean;
}

export interface CrearBancoDto {
    codigo: string;
    nombre: string;
    prefijosTarjeta?: string[];
    activo?: boolean;
}

export type ActualizarBancoDto = Partial<CrearBancoDto>;

/** Un prefijo son de 1 a 19 caracteres: dígitos o `?` (espeja PATRON_PREFIJO del servidor). */
export const PATRON_PREFIJO_TARJETA = /^[0-9?]{1,19}$/;

/** Quita espacios y guiones de un prefijo escrito como `9225 0699` o `????-0699`. */
export const normalizarPrefijo = (prefijo: string): string => prefijo.replace(/[\s-]/g, '');

export const bancoApi = {
    listar: () => apiRequest<Banco[]>('/banco'),
    crear: (dto: CrearBancoDto) => apiRequest<Banco>('/banco', { method: 'POST', body: JSON.stringify(dto) }),
    actualizar: (id: string, dto: ActualizarBancoDto) =>
        apiRequest<Banco>(`/banco/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
};
