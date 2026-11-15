// src/components/puntoVenta/useCobroVenta.ts
//
// Lo que comparten los tres diálogos de pago al cobrar: una clave de idempotencia
// por operación, protección contra el doble clic y el aviso cuando NO se sabe si
// la venta quedó registrada.

import { useCallback, useRef, useState } from 'react';
import { cobrarVenta, ErrorCheckout } from '../../service/ventaService';
import { ClaveIdempotencia } from '../../utils/claveIdempotencia';
import { MONEDA_BASE, formatoImporte } from '../../utils/divisasVenta';
import { getErrorMessage } from '../../utils/errorMessage';
import type { RespuestaCheckout, SolicitudCheckout } from '../../types/venta.types';

/** Un cobro que no terminó de aclararse y que la pantalla debe seguir mostrando. */
export interface AvisoCobro {
    /** `incierto`: reintentar con los mismos datos (es seguro). `bloqueado`: en revisión, no reintentar. */
    tipo: 'incierto' | 'bloqueado';
    mensaje: string;
    /** Referencia de la operación, para que el administrador la busque en `operaciones_idempotentes`. */
    clave?: string;
}

export type ResultadoCobro =
    | { ok: true; respuesta: RespuestaCheckout; repetida: boolean }
    | { ok: false; error: ErrorCheckout };

export function useCobroVenta() {
    const claves = useRef(new ClaveIdempotencia());
    const enVuelo = useRef(false);
    const [enviando, setEnviando] = useState(false);
    const [aviso, setAviso] = useState<AvisoCobro | null>(null);

    /**
     * Cobra. Devuelve `null` si ya hay un cobro en curso (doble clic: el primero sigue
     * su camino y este se ignora). Con los mismos datos reutiliza la clave del intento anterior.
     */
    const cobrar = useCallback(async (solicitud: SolicitudCheckout): Promise<ResultadoCobro | null> => {
        if (enVuelo.current) return null;
        enVuelo.current = true;
        setEnviando(true);
        setAviso(null);

        try {
            const clave = claves.current.para(solicitud);
            const { respuesta, repetida } = await cobrarVenta(solicitud, clave);
            claves.current.liberar(); // la próxima venta, aunque sea idéntica, lleva clave nueva
            return { ok: true, respuesta, repetida };
        } catch (causa) {
            const error =
                causa instanceof ErrorCheckout
                    ? causa
                    : new ErrorCheckout(getErrorMessage(causa, 'No se pudo cobrar la venta'), {
                          status: 0,
                          incierto: true,
                      });

            if (error.incierto) {
                // Se conserva la clave: reintentar con los mismos datos no duplica la venta.
                setAviso({ tipo: 'incierto', mensaje: error.message, clave: error.clave });
            } else if (error.bloqueado) {
                // También se conserva: así cualquier reintento vuelve a chocar con la operación en revisión.
                setAviso({ tipo: 'bloqueado', mensaje: error.message, clave: error.clave });
            } else {
                // Fallo definitivo (datos inválidos, sin stock, sin permiso...): no quedó nada registrado,
                // así que la próxima pulsación es una operación nueva, con clave nueva.
                claves.current.liberar();
            }

            return { ok: false, error };
        } finally {
            enVuelo.current = false;
            setEnviando(false);
        }
    }, []);

    /** Abandona el cobro pendiente: la próxima venta empieza limpia, con clave nueva. */
    const descartar = useCallback(() => {
        claves.current.liberar();
        setAviso(null);
    }, []);

    /**
     * ¿Hay un cobro sin aclarar (o en curso)? Mientras lo haya, el diálogo no debe borrar sus datos al
     * cerrarse o abrirse: otros datos serían otra operación, con otra clave. Se consulta desde efectos y
     * manejadores de eventos, nunca al renderizar.
     */
    const hayPendiente = useCallback(() => claves.current.activa, []);

    return { cobrar, enviando, aviso, descartar, hayPendiente };
}

/**
 * Texto para la notificación de venta registrada. En CUP, como siempre; si se cobró o se devolvió el
 * cambio en otra moneda, con su código y el equivalente (lo que hay que entregar al cliente).
 */
export function textoVentaRegistrada(respuesta: RespuestaCheckout, repetida: boolean): string {
    if (repetida) {
        return `La venta ${respuesta.comprobante} ya estaba registrada: se confirmó sin duplicarla.`;
    }

    const { pago } = respuesta;
    const monedaPago = pago.moneda ?? MONEDA_BASE;
    const monedaCambio = pago.monedaCambio ?? monedaPago;
    const conDivisas = monedaPago !== MONEDA_BASE || monedaCambio !== MONEDA_BASE;
    const total = respuesta.venta.total;

    // Lo cobrado: el total en CUP y, si se pagó en otra moneda, lo que entregó el cliente en ella.
    const cobrado = conDivisas
        ? `${formatoImporte(total, MONEDA_BASE)}${
              monedaPago !== MONEDA_BASE && pago.montoAPagarMoneda !== undefined
                  ? ` (${formatoImporte(pago.montoAPagarMoneda, monedaPago)})`
                  : ''
          }`
        : total.toFixed(2);

    if (respuesta.cambio <= 0) return `Venta ${respuesta.comprobante} registrada por ${cobrado}`;

    // El cambio, en la moneda del pago y, si se devuelve en otra, ya convertido.
    const cambio =
        respuesta.cambioConvertido !== undefined && monedaCambio !== monedaPago
            ? `${formatoImporte(respuesta.cambioConvertido, monedaCambio)} (${formatoImporte(respuesta.cambio, monedaPago)})`
            : conDivisas
                ? formatoImporte(respuesta.cambio, monedaPago)
                : respuesta.cambio.toFixed(2);

    return `Venta ${respuesta.comprobante} registrada por ${cobrado}. Cambio: ${cambio}`;
}
