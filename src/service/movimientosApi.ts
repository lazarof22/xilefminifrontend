import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface ProductoBackend {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta?: number;
    stock_inicial: number;
    stock_minimo?: number;
    estado: string;

    // Se mantienen por compatibilidad con productos existentes.
    almacen?: string | { _id: string };
    contenedor?: string | { _id: string };
}

export interface CrearProductoDto {
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta?: number;
    stock_inicial: number;
    stock_minimo?: number;
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

/**
 * Producto que devuelve el endpoint de existencias
 * cuando la referencia está populated.
 */
export interface ProductoExistenciaBackend {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto?: string;
}

/**
 * Almacén populated dentro de una existencia.
 */
export interface AlmacenExistenciaBackend {
    _id: string;
    nombreAlmacen: string;
}

/**
 * Contenedor populated dentro de una existencia.
 */
export interface ContenedorExistenciaBackend {
    _id: string;
    nombreContenedor: string;
    almacen?: string | { _id: string };
}

/**
 * Representa la cantidad de un producto
 * en una ubicación física concreta.
 */
export interface ExistenciaBackend {
    _id: string;

    producto:
        | string
        | ProductoExistenciaBackend;

    almacen:
        | string
        | AlmacenExistenciaBackend;

    contenedor:
        | string
        | ContenedorExistenciaBackend;

    cantidad: number;

    createdAt?: string;
    updatedAt?: string;
}

/**
 * DTO enviado al backend para ejecutar
 * una transferencia real de inventario.
 */
export interface CrearTransferenciaDto {
    almacen_origen: string;
    almacen_destino: string;
    contenedor_origen: string;
    contenedor_destino: string;
    producto: string;
    cantidad: number;

    /**
     * El backend puede establecer el tipo
     * automáticamente, por eso es opcional.
     */
    tipo?: string;

    fecha?: string;
}

export interface TransferenciaBackend {
    _id: string;
    almacen_origen: string | AlmacenBackend;
    almacen_destino: string | AlmacenBackend;
    contenedor_origen: string | ContenedorBackend;
    contenedor_destino: string | ContenedorBackend;
    producto: string | ProductoBackend;
    cantidad: number;
    tipo?: string;
    fecha?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const movimientosApi = {
    async listarProductos(): Promise<ProductoBackend[]> {
        const { data } = await api.get('/producto');
        return data;
    },

    async crearProducto(
        dto: CrearProductoDto,
    ): Promise<ProductoBackend> {
        const { data } = await api.post(
            '/producto',
            dto,
        );

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

    /**
     * Obtener todas las ubicaciones donde existe
     * físicamente un producto.
     */
    async listarExistenciasProducto(
        productoId: string,
    ): Promise<ExistenciaBackend[]> {
        const { data } = await api.get(
            `/existencias/producto/${productoId}`,
        );

        return data;
    },

    /**
     * Ejecutar transferencia real de inventario.
     */
    async crearTransferencia(
        dto: CrearTransferenciaDto,
    ): Promise<TransferenciaBackend> {
        const { data } = await api.post(
            '/transferencia',
            dto,
        );

        return data;
    },
};

export default movimientosApi;

