// src/service/ventaService.ts
//
// Cobro del punto de venta: UNA sola petición, POST /venta/checkout.
//
//  · El cliente manda productos, cantidades, % de descuento y cómo paga. NUNCA
//    precios, impuestos ni totales: el servidor los calcula y devuelve los suyos.
//  · Cada operación lleva la cabecera `Idempotency-Key` (un UUID generado UNA vez,
//    ver utils/claveIdempotencia.ts). Si la respuesta no llega (corte de red, doble
//    clic) se reintenta con LA MISMA clave y el servidor devuelve la venta ya
//    registrada en vez de vender dos veces.
//  · Los errores que se resuelven solos (red, venta en proceso o a medio registrar)
//    se reintentan aquí con la misma clave; si siguen sin resolverse se avisa de
//    que NO se sabe si la venta quedó registrada (`incierto`).

import { BASE_URL } from './apiConfig';
import { apiRequest } from './httpClient';
import { avisarSesionExpirada, obtenerToken } from '../utils/auth';
import type {
    BancoPago,
    CanalPagoInfo,
    ItemCheckout,
    MonedaCobro,
    ParametrosVenta,
    ProductoCarrito,
    RespuestaCheckout,
    SolicitudCheckout,
    TipoTasa,
} from '../types/venta.types';

export const CABECERA_CLAVE = 'Idempotency-Key';
export const CABECERA_REPETIDA = 'Idempotency-Replayed';

/** Lo que se usa si el servidor no responde los parámetros: el servidor decide igualmente al cobrar. */
export const PARAMETROS_POR_DEFECTO: ParametrosVenta = {
    impuestoPorciento: 0,
    descuentoMaximoPct: 100,
    monedas: [],
};

const TIEMPO_MAXIMO_MS = 30_000;
/** Esperas entre los reintentos automáticos (4 intentos en total). */
const PAUSAS_MS = [800, 1_500, 3_000];

// ═══════════════════════════════════════════════════════════════
// ERRORES
// ═══════════════════════════════════════════════════════════════

export interface DetallesErrorCheckout {
    status: number;
    codigo?: string;
    /** No se sabe si la venta quedó registrada: reintentar con LA MISMA clave y los mismos datos. */
    incierto?: boolean;
    /** Quedó en revisión: no reintentar, avisar al administrador. */
    bloqueado?: boolean;
    /** Suele resolverse solo (red, venta en proceso): se reintenta sola, con la misma clave. */
    automatico?: boolean;
    clave?: string;
}

export class ErrorCheckout extends Error {
    readonly status: number;
    readonly codigo?: string;
    readonly incierto: boolean;
    readonly bloqueado: boolean;
    readonly automatico: boolean;
    readonly clave?: string;

    constructor(mensaje: string, detalles: DetallesErrorCheckout) {
        super(mensaje);
        this.name = 'ErrorCheckout';
        this.status = detalles.status;
        this.codigo = detalles.codigo;
        this.incierto = detalles.incierto ?? false;
        this.bloqueado = detalles.bloqueado ?? false;
        this.automatico = detalles.automatico ?? false;
        this.clave = detalles.clave;
    }
}

function textoDelServidor(mensaje: unknown): string {
    if (typeof mensaje === 'string') return mensaje.trim();
    if (Array.isArray(mensaje)) {
        return mensaje
            .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
            .join('. ');
    }
    return '';
}

/** Traduce la respuesta de error del servidor (`{ statusCode, message, codigo? }`). */
export function aErrorCheckout(status: number, cuerpo: unknown, clave: string): ErrorCheckout {
    const datos = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as {
        message?: unknown;
        codigo?: unknown;
    };
    const texto = textoDelServidor(datos.message);
    const codigo = typeof datos.codigo === 'string' ? datos.codigo : undefined;
    const base = { status, codigo, clave };

    if (status === 401) {
        if (obtenerToken()) avisarSesionExpirada();
        return new ErrorCheckout('Su sesión expiró. Inicie sesión de nuevo para cobrar.', base);
    }

    if (codigo === 'OPERACION_EN_REVISION') {
        return new ErrorCheckout(
            texto || 'La operación quedó en revisión: el servidor no pudo confirmar qué se alcanzó a registrar.',
            { ...base, bloqueado: true },
        );
    }

    if (codigo === 'OPERACION_EN_PROCESO') {
        return new ErrorCheckout(texto || 'La venta sigue procesándose en el servidor.', {
            ...base,
            incierto: true,
            automatico: true,
        });
    }

    if (codigo === 'OPERACION_TOMADA') {
        return new ErrorCheckout(texto || 'El servidor está completando esta venta.', {
            ...base,
            incierto: true,
            automatico: true,
        });
    }

    if (codigo === 'VENTA_PENDIENTE' || status === 502 || status === 503 || status === 504) {
        return new ErrorCheckout(texto || 'La venta está cobrada y se está terminando de registrar.', {
            ...base,
            incierto: true,
            automatico: true,
        });
    }

    if (status === 422) {
        return new ErrorCheckout(
            'Esta operación ya se había enviado con otros datos. Vuelva a pulsar para cobrarla como una venta nueva.',
            base,
        );
    }

    if (status >= 500) {
        // El servidor deshace lo que alcanzó a hacer, pero la pantalla no puede asegurarlo: se trata como "sin confirmar".
        return new ErrorCheckout(
            `${texto || 'Error del servidor.'} Puede reintentar con seguridad: el sistema no duplica la venta.`,
            { ...base, incierto: true },
        );
    }

    return new ErrorCheckout(texto || `Error ${status}`, base);
}

// ═══════════════════════════════════════════════════════════════
// COBRO — POST /venta/checkout
// ═══════════════════════════════════════════════════════════════

export interface ResultadoCobroServicio {
    respuesta: RespuestaCheckout;
    /** El servidor devolvió una venta que ya estaba registrada (reintento): no se duplicó. */
    repetida: boolean;
}

export interface OpcionesCobro {
    /** Esperas entre intentos automáticos (por defecto 0,8 s, 1,5 s y 3 s). */
    pausasMs?: number[];
    /** Tiempo máximo de cada petición. */
    tiempoMaximoMs?: number;
}

const esRespuestaCheckout = (valor: unknown): valor is RespuestaCheckout => {
    if (typeof valor !== 'object' || valor === null) return false;
    const r = valor as Partial<RespuestaCheckout>;
    return typeof r.venta === 'object' && r.venta !== null && typeof r.comprobante === 'string';
};

const dormir = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

async function enviarUnaVez(
    solicitud: SolicitudCheckout,
    clave: string,
    tiempoMaximoMs: number,
): Promise<ResultadoCobroServicio> {
    const token = obtenerToken();

    let respuesta: Response;
    try {
        respuesta = await fetch(`${BASE_URL}/venta/checkout`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                [CABECERA_CLAVE]: clave,
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(solicitud),
            signal: AbortSignal.timeout(tiempoMaximoMs),
        });
    } catch {
        // Sin respuesta (red caída, tiempo agotado): no se sabe si el servidor llegó a procesarla.
        throw new ErrorCheckout('No se pudo conectar con el servidor. Verifique su conexión.', {
            status: 0,
            incierto: true,
            automatico: true,
            clave,
        });
    }

    const cuerpo: unknown = await respuesta.json().catch(() => null);

    if (!respuesta.ok) throw aErrorCheckout(respuesta.status, cuerpo, clave);

    if (!esRespuestaCheckout(cuerpo)) {
        // El servidor dijo "bien" pero la respuesta llegó cortada: reintentar con la misma clave la devuelve completa.
        throw new ErrorCheckout('La respuesta del servidor llegó incompleta.', {
            status: respuesta.status,
            incierto: true,
            automatico: true,
            clave,
        });
    }

    return {
        respuesta: cuerpo,
        repetida:
            cuerpo.idempotencia?.repetida === true || respuesta.headers.get(CABECERA_REPETIDA) === 'true',
    };
}

/**
 * Cobra la venta. `clave` debe ser la MISMA en todos los intentos de la misma
 * operación (ver `ClaveIdempotencia`). Lanza `ErrorCheckout`.
 */
export async function cobrarVenta(
    solicitud: SolicitudCheckout,
    clave: string,
    opciones: OpcionesCobro = {},
): Promise<ResultadoCobroServicio> {
    const pausas = opciones.pausasMs ?? PAUSAS_MS;
    const tiempoMaximoMs = opciones.tiempoMaximoMs ?? TIEMPO_MAXIMO_MS;

    for (let intento = 0; ; intento++) {
        try {
            return await enviarUnaVez(solicitud, clave, tiempoMaximoMs);
        } catch (error) {
            const sePuedeReintentar =
                error instanceof ErrorCheckout && error.automatico && intento < pausas.length;
            if (!sePuedeReintentar) throw error;
            await dormir(pausas[intento]);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// PARÁMETROS — GET /venta/parametros
// ═══════════════════════════════════════════════════════════════

const porcentaje = (valor: unknown, porDefecto: number): number =>
    typeof valor === 'number' && Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : porDefecto;

/** Una moneda de la respuesta del servidor; `null` si le falta la tasa o los billetes (no se puede cobrar en ella). */
function aMonedaCobro(valor: unknown): MonedaCobro | null {
    if (typeof valor !== 'object' || valor === null) return null;
    const m = valor as Record<string, unknown>;

    const codigo = typeof m.codigo === 'string' ? m.codigo.trim().toUpperCase() : '';
    const cupPorUnidad = Number(m.cupPorUnidad);
    if (codigo === '' || !Number.isFinite(cupPorUnidad) || cupPorUnidad <= 0) return null;

    const denominaciones = (Array.isArray(m.denominaciones) ? (m.denominaciones as unknown[]) : [])
        .map(Number)
        .filter((d) => Number.isFinite(d) && d > 0)
        .sort((a, b) => b - a);
    if (denominaciones.length === 0) return null;

    const nombre = typeof m.nombre === 'string' ? m.nombre.trim() : '';
    return { codigo, nombre: nombre || codigo, cupPorUnidad, denominaciones };
}

const aTipoTasa = (valor: unknown): TipoTasa | undefined =>
    valor === 'tasaBancoCentral' || valor === 'tasaMercadoInformal' ? valor : undefined;

interface RespuestaParametros {
    impuestoPorciento?: unknown;
    descuentoMaximoPct?: unknown;
    tipoTasa?: unknown;
    monedas?: unknown;
}

/**
 * Impuesto vigente, descuento máximo del usuario y monedas con las que se puede cobrar (con su
 * tasa y sus billetes), para que la pantalla muestre un estimado fiel. Sin `monedas` (servidor
 * anterior o configuración rota) solo se cobra en CUP con los billetes de siempre.
 */
export async function obtenerParametrosVenta(): Promise<ParametrosVenta> {
    const datos = await apiRequest<RespuestaParametros>('/venta/parametros');
    const monedas = (Array.isArray(datos.monedas) ? (datos.monedas as unknown[]) : [])
        .map(aMonedaCobro)
        .filter((m): m is MonedaCobro => m !== null);

    return {
        impuestoPorciento: porcentaje(datos.impuestoPorciento, PARAMETROS_POR_DEFECTO.impuestoPorciento),
        descuentoMaximoPct: porcentaje(datos.descuentoMaximoPct, PARAMETROS_POR_DEFECTO.descuentoMaximoPct),
        tipoTasa: aTipoTasa(datos.tipoTasa),
        monedas,
    };
}

// ═══════════════════════════════════════════════════════════════
// BANCOS Y CANALES — nomencladores de las transferencias
// ═══════════════════════════════════════════════════════════════

/** Canales de transferencia: los mismos que el servidor, por si no se pudieran leer. */
export const CANALES_PAGO_RESPALDO: CanalPagoInfo[] = [
    { codigo: 'banco', nombre: 'Transferencia bancaria', monedaPorDefecto: 'CUP', requiereBanco: true },
    { codigo: 'transfermovil', nombre: 'Transfermóvil', monedaPorDefecto: 'CUP', requiereBanco: false },
    { codigo: 'enzona', nombre: 'EnZona', monedaPorDefecto: 'CUP', requiereBanco: false },
    { codigo: 'zelle', nombre: 'Zelle', monedaPorDefecto: 'USD', requiereBanco: false },
];

const CODIGOS_CANAL: readonly string[] = CANALES_PAGO_RESPALDO.map((c) => c.codigo);

/** Bancos que se pueden elegir al cobrar (GET /banco?activos=true), por nombre. */
export async function listarBancosActivos(): Promise<BancoPago[]> {
    const datos = await apiRequest<unknown>('/banco?activos=true');
    if (!Array.isArray(datos)) return [];

    return (datos as Record<string, unknown>[])
        .filter(
            (b) => typeof b._id === 'string' && typeof b.codigo === 'string' && typeof b.nombre === 'string',
        )
        .map((b) => ({
            _id: b._id as string,
            codigo: b.codigo as string,
            nombre: b.nombre as string,
            activo: b.activo !== false,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/** Canales por los que puede llegar una transferencia (GET /canal-pago). */
export async function listarCanalesPago(): Promise<CanalPagoInfo[]> {
    const datos = await apiRequest<unknown>('/canal-pago');
    if (!Array.isArray(datos)) return CANALES_PAGO_RESPALDO;

    const canales = (datos as Record<string, unknown>[])
        .filter((c) => typeof c.codigo === 'string' && CODIGOS_CANAL.includes(c.codigo))
        .map((c) => ({
            codigo: c.codigo as CanalPagoInfo['codigo'],
            nombre: typeof c.nombre === 'string' && c.nombre.trim() ? c.nombre : (c.codigo as string),
            monedaPorDefecto:
                typeof c.monedaPorDefecto === 'string' && c.monedaPorDefecto ? c.monedaPorDefecto : 'CUP',
            requiereBanco: c.requiereBanco === true,
        }));
    return canales.length > 0 ? canales : CANALES_PAGO_RESPALDO;
}

// ═══════════════════════════════════════════════════════════════
// AYUDAS: del estado de la pantalla al formato del checkout
// ═══════════════════════════════════════════════════════════════

/** El carrito, sin precios: el servidor pone el precio vigente de cada producto. */
export const itemsDeCarrito = (carrito: ProductoCarrito[]): ItemCheckout[] =>
    carrito.map((p) => ({
        productoId: p.id,
        cantidad: p.cantidad,
        descuentoPct: p.descuento || 0,
    }));

const ES_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/** Solo se envía un cliente si es un _id de MongoDB válido (el servidor rechaza cualquier otro texto). */
export const clienteIdValido = (id?: string | null): string | undefined =>
    id && ES_OBJECT_ID.test(id) ? id : undefined;
