// src/components/puntoVenta/useMonedasCobro.ts
//
// Las monedas con las que se puede cobrar ahora mismo (CUP, USD, EUR...), con su tasa y sus
// billetes, tal como las informa el servidor (GET /venta/parametros). Los diálogos de pago
// las leen cada vez que se abren: así el cajero ve la tasa vigente y no la de cuando cargó la
// pantalla. Si no se pueden leer, se cobra solo en CUP con los billetes de siempre.

import { useEffect, useMemo, useState } from 'react';
import { obtenerParametrosVenta } from '../../service/ventaService';
import { getErrorMessage } from '../../utils/errorMessage';
import { monedasDisponibles } from '../../utils/divisasVenta';
import type { MonedaCobro, TipoTasa } from '../../types/venta.types';

export interface MonedasCobro {
    /** Monedas con las que se puede cobrar. Siempre incluye el CUP, en primer lugar. */
    monedas: MonedaCobro[];
    /** Tasa con la que el servidor convierte las monedas (si la informó). */
    tipoTasa?: TipoTasa;
    /** Se están leyendo del servidor por primera vez. */
    cargando: boolean;
    /** Por qué no se pudieron leer (mientras tanto solo se cobra en CUP). */
    error: string | null;
}

interface Leidas {
    monedas: MonedaCobro[];
    tipoTasa?: TipoTasa;
}

/** `abierto`: el diálogo está abierto; cada vez que se abre se vuelven a leer. */
export function useMonedasCobro(abierto: boolean): MonedasCobro {
    const [leidas, setLeidas] = useState<Leidas | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!abierto) return;
        let vigente = true;

        obtenerParametrosVenta()
            .then((parametros) => {
                if (!vigente) return;
                setLeidas({ monedas: parametros.monedas, tipoTasa: parametros.tipoTasa });
                setError(null);
            })
            .catch((causa: unknown) => {
                if (vigente) setError(getErrorMessage(causa, 'No se pudieron leer las monedas del servidor'));
            });

        return () => {
            vigente = false;
        };
    }, [abierto]);

    const monedas = useMemo(() => monedasDisponibles(leidas?.monedas), [leidas]);

    return {
        monedas,
        tipoTasa: leidas?.tipoTasa,
        cargando: abierto && leidas === null && error === null,
        error,
    };
}
