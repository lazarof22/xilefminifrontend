import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: { 'Content-Type': 'application/json' },
});

export interface ProductoBackend {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_costo: number;
    precio_venta?: number;
    cantidad: number;
    cantidad_minima?: number;
    estado: string;
    almacen?: string | { _id: string };
    contenedor?: string | { _id: string };
}

export interface CrearProductoDto {
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_costo: number;
    precio_venta?: number;
    cantidad: number;
    cantidad_minima?: number;
    estado: string;
    almacen: string;
    contenedor: string;
}

export interface AlmacenBackend {
    _id: string;
    codigoAlmacen: string;
    nombreAlmacen: string;
    cantidadContenedores: number;
}

export interface ContenedorBackend {
    _id: string;
    codigoContenedor: string;
    nombreContenedor: string;
    almacen: string | { _id: string };
}

export const movimientosApi = {
    async listarProductos(): Promise<ProductoBackend[]> {
        const { data } = await api.get('/producto');
        return data;
    },

    async crearProducto(dto: CrearProductoDto): Promise<ProductoBackend> {
        const { data } = await api.post('/producto', dto);
        return data;
    },

    async listarAlmacenes(): Promise<AlmacenBackend[]> {
        const { data } = await api.get('/almacen');
        return data;
    },

    async listarContenedores(): Promise<ContenedorBackend[]> {
        const { data } = await api.get('/contenedor');
        return data;
    },
};

export default movimientosApi;