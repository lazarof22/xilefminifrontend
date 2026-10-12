// src/components/notificaciones/AppAlert.tsx
import React from 'react';
import { Alert, AlertTitle, type AlertColor } from '@mui/material';

export type NotificationSeverity = AlertColor; // 'success' | 'info' | 'warning' | 'error'

export interface AppAlertProps {
    severity: NotificationSeverity;
    message: React.ReactNode;
    /** Título opcional en negrita sobre el mensaje. */
    title?: string;
    /** Si se pasa, el Alert muestra el botón de cerrar. */
    onClose?: () => void;
    /** Botón de acción a la derecha (ej: "Descartar"). Para avisos que viven dentro de un formulario. */
    action?: React.ReactNode;
}

/**
 * Alert de la app: siempre `variant="filled"` para que las cuatro severidades
 * (success, info, warning, error) se vean igual en todas las pantallas.
 * Es el único sitio donde se define su aspecto; las notificaciones globales
 * (NotificationProvider) lo usan, y también puede usarse suelto.
 *
 *   <AppAlert severity="success" message="Producto creado" />
 */
export default function AppAlert({
    severity,
    message,
    title,
    onClose,
    action,
}: AppAlertProps): React.JSX.Element {
    return (
        <Alert
            variant="filled"
            severity={severity}
            onClose={onClose}
            action={action}
            sx={{
                width: '100%',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                '& .MuiAlert-message': { overflowWrap: 'anywhere' },
            }}
        >
            {title && <AlertTitle>{title}</AlertTitle>}
            {message}
        </Alert>
    );
}
