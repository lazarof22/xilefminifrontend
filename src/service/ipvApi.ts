import { apiRequest } from './httpClient';

export interface IpvMovimientos {
    precioCosto: number;
    precioVenta: number;
    inventarioInicial: number;
    entradas: number;
    ajusteDisminucion: number;
    venta: number;
}

export interface IpvFila extends IpvMovimientos {
    /** null mientras la fila no se ha guardado (valores precargados). */
    _id: string | null;
    fecha: string;
    productoId: string;
    codigoProducto: string;
    nombreProducto: string;
    disponible: number;
    inventarioFinal: number;
    importeVenta: number;
    importeCosto: number;
    guardado: boolean;
}

export interface IpvDia {
    fecha: string;
    guardado: boolean;
    items: IpvFila[];
}

export interface IpvItemDto extends IpvMovimientos {
    producto: string;
}

export const obtenerIpv = (fecha: string) =>
    apiRequest<IpvDia>(`/ipv?fecha=${encodeURIComponent(fecha)}`);

export const listarFechasIpv = () => apiRequest<string[]>('/ipv/fechas');

export const guardarIpv = (fecha: string, items: IpvItemDto[]) =>
    apiRequest<IpvDia>('/ipv', { method: 'POST', body: JSON.stringify({ fecha, items }) });

export const actualizarFilaIpv = (id: string, datos: Partial<IpvMovimientos>) =>
    apiRequest<IpvFila>(`/ipv/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });

export const eliminarFilaIpv = (id: string) => apiRequest<void>(`/ipv/${id}`, { method: 'DELETE' });

export const reiniciarIpv = (fecha: string) =>
    apiRequest<{ fecha: string; eliminados: number }>('/ipv/reset', {
        method: 'POST',
        body: JSON.stringify({ fecha }),
    });
