// src/utils/totalesVenta.ts
//
// ESTIMADO de los totales de una venta, con la misma fórmula que el servidor
// (backend: factura-totales.ts y venta/checkout/checkout-totales.ts):
//
//   bruto      = precio × cantidad
//   descuento  = bruto × % / 100          (por línea, nunca más que el bruto)
//   neto       = bruto − descuento
//   base       = Σ neto
//   impuesto   = base × % impuesto / 100  (repartido entre líneas por mayor resto)
//   total      = base + impuesto
//
// Todo se redondea a 2 decimales (mitad hacia arriba). Sirve SOLO para mostrar:
// al cobrar, el servidor recalcula con los precios y el impuesto vigentes y
// manda sus propios totales.

export interface LineaVenta {
    precio: number;
    cantidad: number;
    /** % de descuento de la línea (0 a 100). */
    descuento: number;
}

export interface LineaTotales {
    bruto: number;
    descuentoMonto: number;
    neto: number;
    impuesto: number;
    /** Neto + impuesto. */
    total: number;
}

export interface TotalesVenta {
    lineas: LineaTotales[];
    subtotal: number;
    descuento: number;
    /** Subtotal − descuento. */
    base: number;
    impuestoPorciento: number;
    impuesto: number;
    total: number;
}

/**
 * Redondea a 2 decimales, mitad hacia arriba en magnitud (nunca "redondeo del
 * banquero"), corrigiendo el error binario: 2.675 × 100 = 267.49999999999997.
 */
export function redondear(n: number): number {
    const signo = n < 0 ? -1 : 1;
    return signo * (Math.round(Number((Math.abs(n) * 100).toFixed(8))) / 100);
}

/**
 * Reparte `total` entre las líneas según su peso, por mayor resto: la suma de
 * las partes es SIEMPRE igual a `total` (si se redondeara cada línea por
 * separado, el impuesto de las líneas no cuadraría con el de la venta).
 */
export function repartirCentimos(total: number, pesos: number[]): number[] {
    const totalCentimos = Math.round(redondear(total) * 100);
    const sumaPesos = pesos.reduce((suma, p) => suma + p, 0);

    if (totalCentimos === 0 || sumaPesos <= 0) {
        return pesos.map(() => 0);
    }

    const exactos = pesos.map((p) => (totalCentimos * p) / sumaPesos);
    const partes = exactos.map((e) => Math.floor(e));
    let faltan = totalCentimos - partes.reduce((suma, p) => suma + p, 0);

    const porResto = exactos
        .map((e, i) => ({ i, resto: e - Math.floor(e) }))
        .sort((a, b) => b.resto - a.resto || a.i - b.i);

    for (const { i } of porResto) {
        if (faltan <= 0) break;
        partes[i] += 1;
        faltan -= 1;
    }

    return partes.map((p) => p / 100);
}

const numero = (valor: number): number => (Number.isFinite(valor) ? valor : 0);

export function calcularTotalesVenta(lineas: LineaVenta[], impuestoPorciento: number): TotalesVenta {
    const porciento = Math.max(0, numero(impuestoPorciento));

    let subtotal = 0;
    let descuento = 0;

    const parciales = lineas.map((linea) => {
        const bruto = redondear(Math.max(0, numero(linea.precio)) * Math.max(0, numero(linea.cantidad)));
        const pedido = redondear((bruto * Math.max(0, numero(linea.descuento))) / 100);
        const descuentoMonto = Math.min(pedido, bruto);
        const neto = redondear(Math.max(0, bruto - descuentoMonto));

        subtotal = redondear(subtotal + bruto);
        descuento = redondear(descuento + descuentoMonto);

        return { bruto, descuentoMonto, neto };
    });

    const base = redondear(parciales.reduce((suma, l) => suma + l.neto, 0));
    const impuesto = redondear((base * porciento) / 100);
    const impuestoPorLinea = repartirCentimos(
        impuesto,
        parciales.map((l) => l.neto),
    );

    return {
        lineas: parciales.map((l, i) => ({
            ...l,
            impuesto: impuestoPorLinea[i],
            total: redondear(l.neto + impuestoPorLinea[i]),
        })),
        subtotal,
        descuento,
        base,
        impuestoPorciento: porciento,
        impuesto,
        total: redondear(base + impuesto),
    };
}
