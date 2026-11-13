import { BASE_URL } from './apiConfig';
import { apiRequest } from './httpClient';

export const CUADRE_CAJA_URL = `${BASE_URL}/cuadre-caja`;

export type DenominacionKey =
    | 'billete5000'
    | 'billete2000'
    | 'billete1000'
    | 'billete500'
    | 'billete200'
    | 'billete100'
    | 'billete50'
    | 'billete20'
    | 'billete10'
    | 'billete5'
    | 'billete3'
    | 'billete1';

export type DesgloseBilletes = Record<DenominacionKey, number>;

export const DENOMINACIONES: { key: DenominacionKey; valor: number }[] = [
    { key: 'billete5000', valor: 5000 },
    { key: 'billete2000', valor: 2000 },
    { key: 'billete1000', valor: 1000 },
    { key: 'billete500', valor: 500 },
    { key: 'billete200', valor: 200 },
    { key: 'billete100', valor: 100 },
    { key: 'billete50', valor: 50 },
    { key: 'billete20', valor: 20 },
    { key: 'billete10', valor: 10 },
    { key: 'billete5', valor: 5 },
    { key: 'billete3', valor: 3 },
    { key: 'billete1', valor: 1 },
];

export const desgloseVacio = (): DesgloseBilletes =>
    DENOMINACIONES.reduce((acc, d) => ({ ...acc, [d.key]: 0 }), {} as DesgloseBilletes);

export const totalDesglose = (desglose: Partial<DesgloseBilletes>): number =>
    DENOMINACIONES.reduce((sum, d) => sum + (desglose[d.key] || 0) * d.valor, 0);

export type TipoMotivo = 'ingreso' | 'egreso';

export interface OtroMotivo {
    concepto: string;
    monto: number;
    tipo: TipoMotivo;
}

/** Lo que entró y salió de una caja física (una moneda) con las ventas en efectivo del día. */
export interface EfectivoPorMoneda {
    moneda: string;
    /** Lo que entregaron los clientes en esa moneda. */
    recibido: number;
    /** El cambio que salió de la caja en esa moneda. */
    cambio_entregado: number;
    /** Lo que queda en esa caja por las ventas del día (recibido − cambio). */
    neto: number;
}

export interface ResumenDiario {
    fecha: string;
    cantidad_ventas: number;
    total_ventas_dia: number;
    total_efectivo: number;
    valor_transferencias: number;
    total_creditos: number;
    descuentos: number;
    total_extracciones_dia: number;
    /** Corrección en CUP por las ventas en efectivo cobradas o devueltas en otra moneda (suele ser negativa). */
    ajuste_divisas?: number;
    /** Efectivo por moneda física, para contar cada caja por separado. */
    efectivo_por_moneda?: EfectivoPorMoneda[];
}

export interface CrearCuadreDto {
    fecha?: string;
    empleado: string;
    creditos: number;
    total_ventas_dia: number;
    total_extracciones_dia: number;
    desglose_billetes: DesgloseBilletes;
    valor_transferencias: number;
    recargos: number;
    /** Ajuste en CUP por ventas en efectivo cobradas o devueltas en otra moneda (puede ser negativo). */
    ajuste_divisas?: number;
    descuentos: number;
    otros_motivos: OtroMotivo[];
    total_efectivo?: number;
    realizadoPor?: string;
    observaciones?: string;
}

export interface CuadreCajaBackend extends Omit<CrearCuadreDto, 'empleado' | 'fecha'> {
    _id: string;
    fecha: string;
    empleado: { _id: string; nombre_empleado?: string; ci_empleado?: string } | string | null;
    total_efectivo: number;
    efectivo_esperado: number;
    diferencia: number;
    estado: 'cuadrado' | 'diferencia';
    createdAt?: string;
}

export interface CalculoCuadre {
    efectivoEsperado: number;
    diferencia: number;
    estado: 'cuadrado' | 'diferencia';
}

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Misma fórmula que el backend: ventas netas + recargos - extracciones
 * - transferencias - créditos + ajuste por divisas ± otros motivos. Los descuentos
 * ya vienen restados en las ventas netas, por eso son informativos. El ajuste por
 * divisas corrige las ventas en efectivo cobradas o devueltas en otra moneda: su
 * total no entró en CUP (ver `efectivo_por_moneda` del resumen del día).
 */
export function calcularCuadre(
    datos: Pick<
        CrearCuadreDto,
        | 'total_ventas_dia'
        | 'recargos'
        | 'total_extracciones_dia'
        | 'valor_transferencias'
        | 'creditos'
        | 'ajuste_divisas'
        | 'otros_motivos'
    >,
    totalEfectivo: number,
): CalculoCuadre {
    const otros = datos.otros_motivos.reduce(
        (sum, m) => sum + (m.tipo === 'ingreso' ? m.monto : -m.monto),
        0,
    );
    const efectivoEsperado = redondear(
        datos.total_ventas_dia +
            datos.recargos -
            datos.total_extracciones_dia -
            datos.valor_transferencias -
            datos.creditos +
            (datos.ajuste_divisas ?? 0) +
            otros,
    );
    const diferencia = redondear(totalEfectivo - efectivoEsperado);
    return {
        efectivoEsperado,
        diferencia,
        estado: Math.abs(diferencia) < 0.01 ? 'cuadrado' : 'diferencia',
    };
}

export const obtenerResumenDiario = (fecha: string) =>
    apiRequest<ResumenDiario>(`/cuadre-caja/resumen-diario?fecha=${encodeURIComponent(fecha)}`);

export const listarCuadres = (fecha?: string) =>
    apiRequest<CuadreCajaBackend[]>(
        fecha ? `/cuadre-caja?fecha=${encodeURIComponent(fecha)}` : '/cuadre-caja',
    );

export const crearCuadre = (dto: CrearCuadreDto) =>
    apiRequest<CuadreCajaBackend>('/cuadre-caja', { method: 'POST', body: JSON.stringify(dto) });

export const actualizarCuadre = (id: string, dto: Partial<CrearCuadreDto>) =>
    apiRequest<CuadreCajaBackend>(`/cuadre-caja/${id}`, { method: 'PATCH', body: JSON.stringify(dto) });

export const eliminarCuadre = (id: string) =>
    apiRequest<void>(`/cuadre-caja/${id}`, { method: 'DELETE' });
