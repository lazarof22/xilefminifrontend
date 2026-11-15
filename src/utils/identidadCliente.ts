// src/utils/identidadCliente.ts
//
// Identidad y teléfono de un cliente, con las mismas reglas que el servidor
// (backend: common/utils/identidad.ts). Se usan en el alta de clientes y en el pago a crédito,
// y deben decir lo mismo en los dos:
//
//   · Persona natural → CI: exactamente 11 dígitos.
//   · Empresa o mipyme → NIT: de 5 a 20 letras, números o guiones.
//   · Teléfono: de 5 a 15 dígitos, con el prefijo de país aparte (+53 si no se elige otro).

import type { TipoIdentidad } from '../types/venta.types';

/** La CI cubana: exactamente 11 dígitos. */
export const LONGITUD_CI = 11;
export const PATRON_CI = /^\d{11}$/;

/** El NIT no tiene un formato publicado que se pueda comprobar: se exige que sea razonable. */
export const LONGITUD_MAXIMA_NIT = 20;
export const PATRON_NIT = /^[A-Za-z0-9-]{5,20}$/;

export const LONGITUD_MAXIMA_TELEFONO = 15;
export const PATRON_TELEFONO = /^\d{5,15}$/;

/** Prefijo de país del teléfono: +53, +1, +34... */
export const PATRON_CODIGO_PAIS = /^\+\d{1,4}$/;
export const CODIGO_PAIS_POR_DEFECTO = '+53';

export interface CodigoPais {
    codigo: string;
    pais: string;
}

/** Prefijos que ofrece el selector; Cuba primero (es el de siempre) y los demás por país. */
export const CODIGOS_PAIS: readonly CodigoPais[] = [
    { codigo: '+53', pais: 'Cuba' },
    { codigo: '+1', pais: 'EE. UU. / Canadá' },
    { codigo: '+34', pais: 'España' },
    { codigo: '+52', pais: 'México' },
    { codigo: '+39', pais: 'Italia' },
    { codigo: '+49', pais: 'Alemania' },
    { codigo: '+33', pais: 'Francia' },
    { codigo: '+44', pais: 'Reino Unido' },
    { codigo: '+7', pais: 'Rusia' },
    { codigo: '+55', pais: 'Brasil' },
    { codigo: '+54', pais: 'Argentina' },
    { codigo: '+56', pais: 'Chile' },
    { codigo: '+57', pais: 'Colombia' },
    { codigo: '+58', pais: 'Venezuela' },
    { codigo: '+51', pais: 'Perú' },
    { codigo: '+593', pais: 'Ecuador' },
    { codigo: '+507', pais: 'Panamá' },
    { codigo: '+506', pais: 'Costa Rica' },
    { codigo: '+86', pais: 'China' },
];

/**
 * Los prefijos del selector y, si el cliente trae uno que no está en la lista (guardado antes o
 * escrito a mano), también ese: un select con un valor sin opción no muestra nada.
 */
export function opcionesCodigoPais(actual: string): CodigoPais[] {
    if (!actual || CODIGOS_PAIS.some((c) => c.codigo === actual)) return [...CODIGOS_PAIS];
    return [...CODIGOS_PAIS, { codigo: actual, pais: 'Otro' }];
}

/** Solo dígitos, hasta `maximo`. */
export const soloDigitos = (valor: string, maximo: number): string => valor.replace(/\D/g, '').slice(0, maximo);

/** Solo letras, números y guiones, hasta el máximo del NIT. */
export const limpiarNit = (valor: string): string => valor.replace(/[^A-Za-z0-9-]/g, '').slice(0, LONGITUD_MAXIMA_NIT);

/** Un prefijo válido (+ y de 1 a 4 dígitos) o el de siempre. */
export const codigoPaisValido = (valor?: string | null): string =>
    valor && PATRON_CODIGO_PAIS.test(valor) ? valor : CODIGO_PAIS_POR_DEFECTO;

/** El mensaje de lo que está mal en la identidad, o `undefined` si es válida. */
export function errorIdentidad(tipo: TipoIdentidad, ci: string, nit: string): string | undefined {
    if (tipo === 'CI') {
        if (!ci.trim()) return 'El carnet de identidad es requerido';
        if (!PATRON_CI.test(ci.trim())) return `El carnet de identidad debe tener exactamente ${LONGITUD_CI} dígitos`;
        return undefined;
    }

    if (!nit.trim()) return 'El NIT es requerido';
    if (!PATRON_NIT.test(nit.trim())) return 'El NIT debe tener de 5 a 20 letras, números o guiones';
    return undefined;
}

/** El mensaje de lo que está mal en el teléfono (sin el prefijo), o `undefined` si es válido. */
export function errorTelefono(telefono: string): string | undefined {
    if (!telefono.trim()) return 'El teléfono es requerido';
    if (!PATRON_TELEFONO.test(telefono.trim())) return 'El teléfono debe tener de 5 a 15 dígitos';
    return undefined;
}

// ─── Condición comercial (no es lo mismo que la identidad) ─────────────────

export interface TipoClienteOpcion {
    value: string;
    label: string;
}

/** Condición comercial del cliente: así la guarda el servidor. */
export const TIPOS_CLIENTE: readonly TipoClienteOpcion[] = [
    { value: 'cliente_estandar', label: 'Estándar' },
    { value: 'cliente_descuento', label: 'Con descuento' },
    { value: 'cliente_cuenta_casa', label: 'Cuenta casa' },
];

/** El nombre legible de una condición comercial; el valor tal cual si no se conoce. */
export const etiquetaTipoCliente = (valor: string | undefined): string =>
    TIPOS_CLIENTE.find((t) => t.value === valor)?.label ?? valor ?? '';
