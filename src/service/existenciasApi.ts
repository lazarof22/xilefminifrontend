import { apiRequest } from './httpClient';
import type { ExistenciaBackend } from './movimientosApi';
import { ROL_ADMIN, type UsuarioRol } from '../types/usuarios.types';

// ═══ Existencias por ubicación y conciliación (Fase 1) ═══

export type EstadoConciliacion = 'conciliado' | 'difiere' | 'sin_ubicacion';

/** Cómo se decide cuál es el saldo correcto de un producto que no concilia. */
export type EstrategiaConciliacion = 'stock_producto' | 'existencias' | 'conteo';

export interface UbicacionConciliacion {
    almacenId: string;
    almacenNombre: string;
    contenedorId: string;
    contenedorNombre: string;
    cantidad: number;
}

export type UbicacionPorDefecto = Omit<UbicacionConciliacion, 'cantidad'>;

/** Un producto cuyo stock no coincide con la suma de sus existencias por ubicación. */
export interface FilaConciliacion {
    productoId: string;
    codigo: string;
    nombre: string;
    /** Stock que guarda el producto (lo que han movido ventas, facturas y ajustes). */
    stockProducto: number;
    /** Suma de las cantidades por ubicación (lo que han movido las transferencias). */
    sumaExistencias: number;
    /** stockProducto − sumaExistencias. */
    diferencia: number;
    estado: EstadoConciliacion;
    ubicaciones: UbicacionConciliacion[];
    /** Ubicación por defecto del producto, si es válida. */
    ubicacionPorDefecto?: UbicacionPorDefecto;
}

export interface ReporteConciliacion {
    unificado: boolean;
    unificadoEn?: string;
    unificadoPor?: string;
    totalProductos: number;
    conciliados: number;
    conDiferencias: number;
    /** Solo los productos que NO concilian. */
    filas: FilaConciliacion[];
}

export interface EstadoExistencias {
    /** true cuando el stock se lleva por ubicación (ventas, facturas y ajustes descuentan de ahí). */
    unificado: boolean;
    unificadoEn?: string;
}

export interface UbicacionConteo {
    almacenId: string;
    contenedorId: string;
    cantidad: number;
}

export interface ResolverConciliacionDto {
    productoId: string;
    estrategia: EstrategiaConciliacion;
    /** Obligatoria en `conteo`; en `stock_producto` solo si el producto no tiene ninguna ubicación. */
    ubicaciones?: UbicacionConteo[];
    observacion?: string;
}

export interface ResultadoResolucion {
    productoId: string;
    estado: 'conciliado';
}

/** Ubicaciones ordenadas por almacén y contenedor (el backend no garantiza un orden). */
export const ordenarUbicaciones = <T extends { almacenNombre: string; contenedorNombre: string }>(
    ubicaciones: T[],
): T[] =>
    [...ubicaciones].sort(
        (a, b) =>
            a.almacenNombre.localeCompare(b.almacenNombre, 'es') ||
            a.contenedorNombre.localeCompare(b.contenedorNombre, 'es', { numeric: true }),
    );

/** Quién puede ver el reporte de conciliación (el backend lo valida también). */
const ROLES_VER: readonly UsuarioRol[] = [ROL_ADMIN, 'gerente', 'economico'];
/** Quién puede cambiar saldos al conciliar. */
const ROLES_RESOLVER: readonly UsuarioRol[] = [ROL_ADMIN, 'economico'];

export const puedeVerConciliacion = (rol?: string): boolean => ROLES_VER.some((r) => r === rol);
export const puedeResolverConciliacion = (rol?: string): boolean => ROLES_RESOLVER.some((r) => r === rol);
/** Solo el administrador activa el modo unificado. */
export const puedeActivarConciliacion = (rol?: string): boolean => rol === ROL_ADMIN;

export const existenciasApi = {
    /** Público para cualquier usuario con sesión: ¿el inventario ya usa las existencias por ubicación? */
    estado(): Promise<EstadoExistencias> {
        return apiRequest<EstadoExistencias>('/existencias/estado');
    },

    /** Dónde hay stock de un producto (cantidad > 0), de mayor a menor. */
    listarPorProducto(productoId: string): Promise<ExistenciaBackend[]> {
        return apiRequest<ExistenciaBackend[]>(`/existencias/producto/${encodeURIComponent(productoId)}`);
    },

    reporteConciliacion(): Promise<ReporteConciliacion> {
        return apiRequest<ReporteConciliacion>('/existencias/conciliacion');
    },

    resolverConciliacion(dto: ResolverConciliacionDto): Promise<ResultadoResolucion> {
        return apiRequest<ResultadoResolucion>('/existencias/conciliacion/resolver', {
            method: 'POST',
            body: JSON.stringify(dto),
        });
    },

    activarModoUnificado(): Promise<ReporteConciliacion> {
        return apiRequest<ReporteConciliacion>('/existencias/conciliacion/activar', { method: 'POST' });
    },
};
