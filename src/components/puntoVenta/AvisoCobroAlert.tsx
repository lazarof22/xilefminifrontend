// src/components/puntoVenta/AvisoCobroAlert.tsx
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import AppAlert from '../notificaciones/AppAlert';
import type { AvisoCobro } from './useCobroVenta';

interface AvisoCobroAlertProps {
    aviso: AvisoCobro | null;
    onDescartar: () => void;
    /** Deshabilita el botón mientras se reintenta. */
    ocupado?: boolean;
}

/**
 * Aviso dentro del diálogo de pago cuando NO se sabe si la venta quedó registrada
 * (corte de red, venta a medio registrar) o cuando quedó en revisión.
 */
export default function AvisoCobroAlert({
    aviso,
    onDescartar,
    ocupado = false,
}: AvisoCobroAlertProps): React.JSX.Element | null {
    if (!aviso) return null;

    const bloqueado = aviso.tipo === 'bloqueado';

    return (
        <Box sx={{ mb: 2 }}>
            <AppAlert
                severity={bloqueado ? 'error' : 'warning'}
                title={bloqueado ? 'Venta en revisión' : 'Venta sin confirmar'}
                action={
                    <Button color="inherit" size="small" onClick={onDescartar} disabled={ocupado}>
                        Descartar
                    </Button>
                }
                message={
                    <>
                        {aviso.mensaje}{' '}
                        {bloqueado
                            ? 'No vuelva a cobrarla: avise al administrador.'
                            : 'Pulse "Reintentar cobro": se usa la misma clave y no se duplica la venta. No cambie el carrito ni los datos hasta confirmar.'}
                        {aviso.clave && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.85 }}>
                                Referencia: {aviso.clave}
                            </Typography>
                        )}
                    </>
                }
            />
        </Box>
    );
}
