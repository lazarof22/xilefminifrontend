// src/components/notificaciones/notifier.ts
//
// Punto de entrada único para mostrar notificaciones, dentro o fuera de React:
//
//   import { notify } from '../components/notificaciones/notifier';
//   notify.success('Producto creado');
//   notify.error(getErrorMessage(error));
//
// Dentro de un componente se puede usar el hook `useNotify()` (es el mismo
// objeto). Quien las dibuja es <NotificationProvider />, montado una sola vez
// en main.tsx.

import type { NotificationSeverity } from './AppAlert';

export type { NotificationSeverity };

export interface NotifyOptions {
    /** Milisegundos hasta que se cierra sola. `null` = hasta que el usuario la cierre. */
    duration?: number | null;
    /** Título opcional en negrita sobre el mensaje. */
    title?: string;
}

export interface NotificationRequest extends NotifyOptions {
    severity: NotificationSeverity;
    message: string;
}

/** Tiempo en pantalla por severidad: los errores se quedan más para dar tiempo a leerlos. */
export const DEFAULT_DURATION: Record<NotificationSeverity, number> = {
    success: 4000,
    info: 5000,
    warning: 6000,
    error: 8000,
};

interface Handler {
    show: (request: NotificationRequest) => string;
    close: (id: string) => void;
    clear: () => void;
}

let handler: Handler | null = null;
// Avisos pedidos antes de que el proveedor se monte (p. ej. durante el arranque).
const pendientes: NotificationRequest[] = [];

/** Lo usa NotificationProvider al montarse/desmontarse. No llamar desde otros sitios. */
export function registrarManejador(nuevo: Handler | null): void {
    handler = nuevo;
    if (nuevo) {
        while (pendientes.length > 0) {
            nuevo.show(pendientes.shift()!);
        }
    }
}

function mostrar(
    severity: NotificationSeverity,
    message: string,
    options?: NotifyOptions,
): string {
    const request: NotificationRequest = { severity, message, ...options };
    if (handler) return handler.show(request);
    pendientes.push(request);
    return '';
}

export const notify = {
    success: (message: string, options?: NotifyOptions) => mostrar('success', message, options),
    info: (message: string, options?: NotifyOptions) => mostrar('info', message, options),
    warning: (message: string, options?: NotifyOptions) => mostrar('warning', message, options),
    error: (message: string, options?: NotifyOptions) => mostrar('error', message, options),
    /** Cuando la severidad viene en una variable. */
    show: mostrar,
    close: (id: string): void => handler?.close(id),
    clear: (): void => handler?.clear(),
};

export type Notify = typeof notify;
