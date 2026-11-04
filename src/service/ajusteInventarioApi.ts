import { apiRequest } from './httpClient';

// ═══ Ajuste de inventario SC-2-16 ═══
// Exige causa, autorización y firma. El servidor lee el saldo antes y calcula
// el saldo después: el cliente no los envía.

export interface LineaAjuste {
    producto: string;
    almacen: string;
    contenedor: string;
    saldoAntes: number;
    /** Positivo suma, negativo resta. */
    ajuste: number;
    saldoDespues: number;
}

export interface AjusteInventario {
    _id: string;
    numeroConsecutivo: string;
    causa: string;
    autorizadoPor: string;
    firmadoPor: string;
    registradoPor: string;
    lineas: LineaAjuste[];
    createdAt?: string;
}

export interface CrearLineaAjusteDto {
    producto: string;
    almacen: string;
    contenedor: string;
    ajuste: number;
}

export interface CrearAjusteInventarioDto {
    causa: string;
    autorizadoPor: string;
    firmadoPor: string;
    lineas: CrearLineaAjusteDto[];
}

/** Roles que pueden ajustar y consultar ajustes (administrador y económico). */
export const puedeAjustarInventario = (rol?: string): boolean => rol === 'administrador' || rol === 'economico';

export const ajusteInventarioApi = {
    listar(): Promise<AjusteInventario[]> {
        return apiRequest<AjusteInventario[]>('/ajuste-inventario');
    },

    obtener(id: string): Promise<AjusteInventario> {
        return apiRequest<AjusteInventario>(`/ajuste-inventario/${encodeURIComponent(id)}`);
    },

    crear(dto: CrearAjusteInventarioDto): Promise<AjusteInventario> {
        return apiRequest<AjusteInventario>('/ajuste-inventario', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },
};
