// src/components/notificaciones/useNotify.ts
import { notify, type Notify } from './notifier';

/**
 * Acceso a las notificaciones desde un componente:
 *
 *   const notify = useNotify();
 *   notify.success('Guardado');
 *   notify.error('No se pudo guardar');
 *
 * Devuelve siempre el mismo objeto, así que es seguro usarlo en dependencias
 * de useEffect / useCallback.
 */
export function useNotify(): Notify {
    return notify;
}
