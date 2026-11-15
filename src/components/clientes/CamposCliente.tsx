// src/components/clientes/CamposCliente.tsx
//
// Los campos de identidad y de teléfono de un cliente. Los comparten el alta de clientes y el pago a
// crédito, para que pidan y validen lo mismo (reglas en utils/identidadCliente.ts):
//
//   · Identidad: dos entradas, CI (persona natural) y NIT (empresa o mipyme), con un botón de opción
//     al lado de cada una. Solo está habilitada la que se eligió.
//   · Teléfono: prefijo de país seleccionable (+53 de siempre) y el número.

import React from 'react';
import { Box, MenuItem, Radio, RadioGroup, TextField } from '@mui/material';
import type { TipoIdentidad } from '../../types/venta.types';
import {
    LONGITUD_CI,
    LONGITUD_MAXIMA_NIT,
    LONGITUD_MAXIMA_TELEFONO,
    PATRON_NIT,
    limpiarNit,
    opcionesCodigoPais,
    soloDigitos,
} from '../../utils/identidadCliente';

type Tamano = 'small' | 'medium';

// ─── Identidad: CI o NIT ──────────────────────────────────

export interface CamposIdentidadProps {
    tipo: TipoIdentidad;
    ci: string;
    nit: string;
    onTipoChange: (tipo: TipoIdentidad) => void;
    onCiChange: (ci: string) => void;
    onNitChange: (nit: string) => void;
    /** Mensaje del servidor o de la validación para la CI. */
    errorCi?: string;
    errorNit?: string;
    disabled?: boolean;
    size?: Tamano;
}

export function CamposIdentidad({
    tipo,
    ci,
    nit,
    onTipoChange,
    onCiChange,
    onNitChange,
    errorCi,
    errorNit,
    disabled = false,
    size = 'medium',
}: CamposIdentidadProps): React.JSX.Element {
    const ciIncompleta = tipo === 'CI' && ci.length > 0 && ci.length !== LONGITUD_CI;
    const nitInvalido = tipo === 'NIT' && nit.length > 0 && !PATRON_NIT.test(nit);

    return (
        <RadioGroup
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value === 'NIT' ? 'NIT' : 'CI')}
            aria-label="Identificación del cliente"
        >
            {/* Persona natural: carnet de identidad */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Radio
                    value="CI"
                    disabled={disabled}
                    slotProps={{ input: { 'aria-label': 'Identificar con carnet de identidad' } }}
                    sx={{ mt: size === 'small' ? 1.5 : 2.5 }}
                />
                <TextField
                    fullWidth
                    label="Carnet de Identidad"
                    margin="normal"
                    size={size}
                    value={ci}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCiChange(soloDigitos(e.target.value, LONGITUD_CI))}
                    error={!!errorCi || ciIncompleta}
                    helperText={
                        errorCi ||
                        (ciIncompleta
                            ? `Debe tener exactamente ${LONGITUD_CI} dígitos (${ci.length}/${LONGITUD_CI})`
                            : 'Persona natural: 11 dígitos')
                    }
                    disabled={disabled || tipo !== 'CI'}
                    slotProps={{
                        htmlInput: { maxLength: LONGITUD_CI, inputMode: 'numeric', pattern: '[0-9]*' },
                    }}
                />
            </Box>

            {/* Empresa o mipyme: NIT */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                <Radio
                    value="NIT"
                    disabled={disabled}
                    slotProps={{ input: { 'aria-label': 'Identificar con NIT' } }}
                    sx={{ mt: size === 'small' ? 1.5 : 2.5 }}
                />
                <TextField
                    fullWidth
                    label="NIT"
                    margin="normal"
                    size={size}
                    value={nit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNitChange(limpiarNit(e.target.value))}
                    error={!!errorNit || nitInvalido}
                    helperText={errorNit || 'Empresa o mipyme: de 5 a 20 letras, números o guiones'}
                    disabled={disabled || tipo !== 'NIT'}
                    slotProps={{ htmlInput: { maxLength: LONGITUD_MAXIMA_NIT } }}
                />
            </Box>
        </RadioGroup>
    );
}

// ─── Teléfono con prefijo de país ──────────────────────────

export interface CamposTelefonoProps {
    codigoPais: string;
    telefono: string;
    onCodigoPaisChange: (codigoPais: string) => void;
    onTelefonoChange: (telefono: string) => void;
    error?: string;
    disabled?: boolean;
    size?: Tamano;
}

export function CamposTelefono({
    codigoPais,
    telefono,
    onCodigoPaisChange,
    onTelefonoChange,
    error,
    disabled = false,
    size = 'medium',
}: CamposTelefonoProps): React.JSX.Element {
    return (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <TextField
                select
                label="Prefijo"
                margin="normal"
                size={size}
                value={codigoPais}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCodigoPaisChange(e.target.value)}
                disabled={disabled}
                sx={{ width: 150, flexShrink: 0 }}
                slotProps={{
                    select: { renderValue: (valor) => String(valor) },
                    htmlInput: { 'aria-label': 'Prefijo de país' },
                }}
            >
                {opcionesCodigoPais(codigoPais).map((opcion) => (
                    <MenuItem key={opcion.codigo} value={opcion.codigo}>
                        {opcion.codigo} {opcion.pais}
                    </MenuItem>
                ))}
            </TextField>
            <TextField
                fullWidth
                label="Teléfono"
                margin="normal"
                size={size}
                value={telefono}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onTelefonoChange(soloDigitos(e.target.value, LONGITUD_MAXIMA_TELEFONO))
                }
                error={!!error}
                helperText={error || 'Sin el prefijo del país'}
                disabled={disabled}
                slotProps={{ htmlInput: { maxLength: LONGITUD_MAXIMA_TELEFONO, inputMode: 'tel', pattern: '[0-9]*' } }}
            />
        </Box>
    );
}
