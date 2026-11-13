// src/utils/divisasVenta.ts
//
// Las cuentas del cobro en otras monedas, con las mismas fórmulas que el servidor
// (backend: modules/inventario/pago/divisas.ts):
//
//   · Las tasas son CUP por 1 unidad de la moneda (la del CUP es 1).
//   · Lo que hay que cobrar en otra moneda = total en CUP ÷ tasa, a 2 decimales.
//   · Cambio en otra moneda = cambio × tasa del pago ÷ tasa del cambio.
//
// Sirve SOLO para mostrar lo que verá el cajero: al cobrar, el servidor recalcula con
// la tasa vigente y manda sus propios importes (son los que se registran).

import type { DesgloseBilletes, MonedaCobro } from '../types/venta.types';
import { redondear } from './totalesVenta';

/** Moneda en la que está expresado todo en el sistema (precios, totales, tasas). */
export const MONEDA_BASE = 'CUP';

/** Billetes y monedas de CUP de siempre: se usan solo si el servidor no informa los suyos. */
export const DENOMINACIONES_CUP_RESPALDO: readonly number[] = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 3, 1];

/** El CUP "de siempre", para cuando el servidor no dijo con qué monedas se puede cobrar. */
export const CUP_RESPALDO: MonedaCobro = {
    codigo: MONEDA_BASE,
    nombre: 'Peso cubano',
    cupPorUnidad: 1,
    denominaciones: [...DENOMINACIONES_CUP_RESPALDO],
    respaldo: true,
};

/** Clave del desglose anterior (billeteN) de cada denominación de CUP. */
const CLAVE_DESGLOSE_CUP: ReadonlyArray<readonly [number, keyof DesgloseBilletes]> = [
    [5000, 'billete5000'],
    [2000, 'billete2000'],
    [1000, 'billete1000'],
    [500, 'billete500'],
    [200, 'billete200'],
    [100, 'billete100'],
    [50, 'billete50'],
    [20, 'billete20'],
    [10, 'billete10'],
    [5, 'billete5'],
    [3, 'billete3'],
    [1, 'billete1'],
];

/** Billetes y monedas recibidos: valor ("100") → cantidad. */
export type DesgloseDenominaciones = Record<string, number>;

/**
 * Las monedas con las que se puede cobrar: las que informa el servidor y, siempre y en primer
 * lugar, el CUP. Sin lista del servidor (o sin CUP en ella) se usa el CUP de siempre.
 */
export function monedasDisponibles(delServidor?: readonly MonedaCobro[] | null): MonedaCobro[] {
    const validas = (delServidor ?? []).filter(
        (m) =>
            m.codigo !== '' &&
            Number.isFinite(m.cupPorUnidad) &&
            m.cupPorUnidad > 0 &&
            m.denominaciones.length > 0,
    );
    const cup = validas.find((m) => m.codigo === MONEDA_BASE) ?? CUP_RESPALDO;
    return [cup, ...validas.filter((m) => m.codigo !== MONEDA_BASE)];
}

/** La moneda de `codigo` entre las disponibles; el CUP si no está. */
export function buscarMoneda(monedas: readonly MonedaCobro[], codigo: string): MonedaCobro {
    return monedas.find((m) => m.codigo === codigo) ?? monedas.find((m) => m.codigo === MONEDA_BASE) ?? CUP_RESPALDO;
}

/** Lo que hay que cobrar en `moneda` por un total en CUP (2 decimales). */
export function importeEnMoneda(totalCUP: number, moneda: MonedaCobro): number {
    if (moneda.codigo === MONEDA_BASE) return redondear(totalCUP);
    return redondear(totalCUP / moneda.cupPorUnidad);
}

/** Cambio expresado en otra moneda: `cambioA × tasaA ÷ tasaB` (tasas en CUP por unidad). */
export function convertirCambio(cambioA: number, tasaA: number, tasaB: number): number {
    return redondear((cambioA * tasaA) / tasaB);
}

/** Suma valor × cantidad de un desglose (en la moneda del desglose), sin error de coma flotante. */
export function totalDeDesglose(desglose: DesgloseDenominaciones): number {
    const centimos = Object.entries(desglose).reduce((suma, [valor, cantidad]) => {
        const n = Number.isFinite(cantidad) && cantidad > 0 ? Math.floor(cantidad) : 0;
        return suma + Math.round(Number(valor) * 100) * n;
    }, 0);
    return centimos / 100;
}

/** El desglose sin las denominaciones en 0 ni cantidades inválidas. */
export function desgloseConCantidades(desglose: DesgloseDenominaciones): DesgloseDenominaciones {
    const limpio: DesgloseDenominaciones = {};
    for (const [valor, cantidad] of Object.entries(desglose)) {
        if (Number.isFinite(cantidad) && cantidad > 0) limpio[valor] = Math.floor(cantidad);
    }
    return limpio;
}

export interface CobroEfectivo {
    /** Lo que hay que cobrar, en la moneda del pago. */
    aPagar: number;
    /** Lo que entregó el cliente, en la moneda del pago. */
    recibido: number;
    /** Cambio, en la moneda del pago (0 si falta dinero). */
    cambio: number;
    /** El cambio en la moneda de devolución, si es otra distinta de la del pago. */
    cambioConvertido?: number;
    /** Lo que falta por entregar, en la moneda del pago (0 si alcanza). */
    falta: number;
}

/**
 * Lo que verá el cajero al cobrar en efectivo: importe, cambio y su conversión a la moneda
 * en la que se devuelve.
 */
export function calcularCobroEfectivo(
    totalCUP: number,
    moneda: MonedaCobro,
    monedaCambio: MonedaCobro,
    recibido: number,
): CobroEfectivo {
    const aPagar = importeEnMoneda(totalCUP, moneda);
    const recibidoRedondeado = redondear(recibido);
    const diferencia = redondear(recibidoRedondeado - aPagar);
    const cambio = diferencia > 0 ? diferencia : 0;
    const falta = diferencia < 0 ? redondear(-diferencia) : 0;
    const otraMoneda = monedaCambio.codigo !== moneda.codigo;

    return {
        aPagar,
        recibido: recibidoRedondeado,
        cambio,
        ...(otraMoneda ? { cambioConvertido: convertirCambio(cambio, moneda.cupPorUnidad, monedaCambio.cupPorUnidad) } : {}),
        falta,
    };
}

/**
 * El desglose en el formato que espera el servidor. Con las monedas del servidor va
 * `desgloseDenominaciones` (valor → cantidad); con el CUP de respaldo, el desglose de siempre
 * (billeteN), que no depende del nomenclador de billetes.
 */
export function desgloseParaServidor(
    moneda: MonedaCobro,
    desglose: DesgloseDenominaciones,
): { desgloseDenominaciones: DesgloseDenominaciones } | { desglose: Partial<DesgloseBilletes> } {
    const conCantidades = desgloseConCantidades(desglose);

    if (!moneda.respaldo) return { desgloseDenominaciones: conCantidades };

    const anterior: Partial<DesgloseBilletes> = {};
    for (const [valor, clave] of CLAVE_DESGLOSE_CUP) {
        const cantidad = conCantidades[String(valor)];
        if (cantidad) anterior[clave] = cantidad;
    }
    return { desglose: anterior };
}

/** "1234.50 USD": un importe con su moneda (2 decimales, como el resto de la pantalla). */
export function formatoImporte(valor: number, codigoMoneda: string): string {
    return `${valor.toFixed(2)} ${codigoMoneda}`;
}

/** Símbolo para mostrar junto a un importe: $ para CUP, US$ para USD, € para EUR; el código en otro caso. */
export function simboloMoneda(codigoMoneda: string): string {
    if (codigoMoneda === 'CUP') return '$';
    if (codigoMoneda === 'USD') return 'US$';
    if (codigoMoneda === 'EUR') return '€';
    return `${codigoMoneda} `;
}
