// src/components/puntoVenta/SelectorClienteVenta.tsx
//
// Cliente (opcional) de la venta. Se elige entre los clientes del servidor (GET /cliente) o se crea
// uno nuevo con el diálogo de alta. Muestra su condición comercial:
//   · Estándar: sin cambios.
//   · Con descuento X %: el servidor aplica ese % a cada línea (el estimado del carrito también).
//   · Cuenta casa: la mercancía se entrega sin cobrar (monto pagado 0).

import React, { useCallback, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Chip, TextField, Typography } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DialogCrearCliente, { type ClienteFormData } from '../AddClientDialog';
import { aClienteVenta, listarClientesVenta, textoTipoCliente } from '../../service/ventaService';
import { getErrorMessage } from '../../utils/errorMessage';
import type { ClienteVenta } from '../../types/venta.types';

export interface SelectorClienteVentaProps {
    cliente: ClienteVenta | null;
    onClienteChange: (cliente: ClienteVenta | null) => void;
    disabled?: boolean;
}

/** Color del chip de la condición comercial (siempre de la paleta del tema). */
const colorDeTipo = (cliente: ClienteVenta): 'default' | 'success' | 'warning' =>
    cliente.tipo_cliente === 'cliente_descuento'
        ? 'success'
        : cliente.tipo_cliente === 'cliente_cuenta_casa'
            ? 'warning'
            : 'default';

export default function SelectorClienteVenta({
    cliente,
    onClienteChange,
    disabled = false,
}: SelectorClienteVentaProps): React.JSX.Element {
    const [opciones, setOpciones] = useState<ClienteVenta[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openCrear, setOpenCrear] = useState(false);

    // Se leen al abrir la lista: así aparecen los clientes creados desde otra pantalla.
    const cargar = useCallback(async (): Promise<void> => {
        setCargando(true);
        setError(null);
        try {
            setOpciones(await listarClientesVenta());
        } catch (causa) {
            setError(getErrorMessage(causa, 'No se pudieron cargar los clientes'));
        } finally {
            setCargando(false);
        }
    }, []);

    const handleClienteCreado = (creado: ClienteFormData): void => {
        const nuevo = aClienteVenta(creado);
        if (!nuevo) return;
        setOpciones((prev) => [...prev.filter((c) => c._id !== nuevo._id), nuevo]);
        onClienteChange(nuevo);
    };

    // El cliente elegido siempre es una opción de la lista (aunque aún no se haya cargado).
    const lista = cliente && !opciones.some((c) => c._id === cliente._id) ? [cliente, ...opciones] : opciones;

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                    fullWidth
                    size="small"
                    options={lista}
                    value={cliente}
                    loading={cargando}
                    disabled={disabled}
                    onOpen={() => { void cargar(); }}
                    onChange={(_evento, valor) => onClienteChange(valor)}
                    getOptionLabel={(c) => c.nombre_cliente}
                    isOptionEqualToValue={(a, b) => a._id === b._id}
                    noOptionsText={error ?? 'No hay clientes'}
                    loadingText="Cargando clientes…"
                    renderOption={(props, c) => (
                        <li {...props} key={c._id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body2">{c.nombre_cliente}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {c.id_cliente} · {textoTipoCliente(c)}
                                </Typography>
                            </Box>
                        </li>
                    )}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Cliente de la venta (opcional)"
                            placeholder="Buscar por nombre"
                            error={!!error}
                        />
                    )}
                />
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PersonAddIcon sx={{ fontSize: 'medium' }} />}
                    onClick={() => setOpenCrear(true)}
                    disabled={disabled}
                    sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', height: 40 }}
                >
                    Nuevo
                </Button>
            </Box>

            {cliente && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                        Tipo de cliente:
                    </Typography>
                    <Chip size="small" color={colorDeTipo(cliente)} label={textoTipoCliente(cliente)} />
                </Box>
            )}

            {cliente?.tipo_cliente === 'cliente_descuento' && (
                <Alert severity="success" sx={{ mt: 1, py: 0 }}>
                    Descuento de cliente aplicado: {cliente.descuentoPct} %
                </Alert>
            )}
            {cliente?.tipo_cliente === 'cliente_cuenta_casa' && (
                <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                    Cuenta casa: la mercancía se entrega sin cobro (monto pagado 0).
                </Alert>
            )}

            <DialogCrearCliente
                open={openCrear}
                onClose={() => setOpenCrear(false)}
                onClienteCreado={handleClienteCreado}
            />
        </Box>
    );
}
