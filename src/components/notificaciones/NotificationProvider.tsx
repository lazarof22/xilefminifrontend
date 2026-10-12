// src/components/notificaciones/NotificationProvider.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Collapse } from '@mui/material';
import AppAlert, { type NotificationSeverity } from './AppAlert';
import {
    DEFAULT_DURATION,
    registrarManejador,
    type NotificationRequest,
} from './notifier';

/** Máximo de avisos visibles a la vez; al superarlo se cierra el más antiguo. */
const MAX_VISIBLES = 4;
/** Tiempo extra que se concede al quitar el ratón de encima de un aviso. */
const GRACIA_TRAS_HOVER = 2000;

interface Aviso {
    id: string;
    severity: NotificationSeverity;
    message: string;
    title?: string;
    duration: number | null;
    /** Veces que se pidió el mismo aviso mientras seguía visible. */
    repeticiones: number;
    /** true mientras se reproduce la animación de salida. */
    cerrando: boolean;
}

const mismoAviso = (a: Aviso, r: NotificationRequest) =>
    !a.cerrando && a.severity === r.severity && a.message === r.message && a.title === r.title;

/**
 * Dibuja TODAS las notificaciones de la app en un único sitio: arriba, en el
 * centro de la pantalla, por encima de diálogos y menús. Se monta una vez en
 * main.tsx, dentro del tema. Se alimenta con `notify` / `useNotify()`.
 */
export default function NotificationProvider({
    children,
}: {
    children: React.ReactNode;
}): React.JSX.Element {
    const [avisos, setAvisos] = useState<Aviso[]>([]);
    // Fuente de verdad síncrona: `mostrar` necesita ver los avisos actuales al instante
    // (las funciones de actualización de setState no se ejecutan en el acto).
    const avisosRef = useRef<Aviso[]>([]);
    const actualizar = useCallback((fn: (prev: Aviso[]) => Aviso[]) => {
        avisosRef.current = fn(avisosRef.current);
        setAvisos(avisosRef.current);
    }, []);
    const temporizadores = useRef(new Map<string, ReturnType<typeof setTimeout>>());
    const contador = useRef(0);

    const cancelarTemporizador = useCallback((id: string) => {
        const t = temporizadores.current.get(id);
        if (t !== undefined) {
            clearTimeout(t);
            temporizadores.current.delete(id);
        }
    }, []);

    const cerrar = useCallback(
        (id: string) => {
            cancelarTemporizador(id);
            actualizar((prev) => prev.map((a) => (a.id === id ? { ...a, cerrando: true } : a)));
        },
        [cancelarTemporizador, actualizar],
    );

    const programar = useCallback(
        (id: string, ms: number | null) => {
            cancelarTemporizador(id);
            if (ms === null) return;
            temporizadores.current.set(
                id,
                setTimeout(() => cerrar(id), ms),
            );
        },
        [cancelarTemporizador, cerrar],
    );

    const mostrar = useCallback(
        (request: NotificationRequest): string => {
            const duration =
                request.duration === undefined ? DEFAULT_DURATION[request.severity] : request.duration;

            // Si el mismo aviso ya está en pantalla no se duplica: se reinicia su tiempo y se cuenta.
            const existente = avisosRef.current.find((a) => mismoAviso(a, request));
            if (existente) {
                const id = existente.id;
                actualizar((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, repeticiones: a.repeticiones + 1 } : a)),
                );
                programar(id, duration);
                return id;
            }

            contador.current += 1;
            const id = `aviso-${contador.current}`;
            const nuevo: Aviso = {
                id,
                severity: request.severity,
                message: request.message,
                title: request.title,
                duration,
                repeticiones: 1,
                cerrando: false,
            };
            actualizar((prev) => {
                const siguientes = [...prev, nuevo];
                const activos = siguientes.filter((a) => !a.cerrando);
                const sobrantes = activos.slice(0, Math.max(0, activos.length - MAX_VISIBLES));
                sobrantes.forEach((s) => cancelarTemporizador(s.id));
                return siguientes.map((a) =>
                    sobrantes.some((s) => s.id === a.id) ? { ...a, cerrando: true } : a,
                );
            });
            programar(id, duration);
            return id;
        },
        [programar, cancelarTemporizador, actualizar],
    );

    const limpiar = useCallback(() => {
        temporizadores.current.forEach((t) => clearTimeout(t));
        temporizadores.current.clear();
        actualizar((prev) => prev.map((a) => ({ ...a, cerrando: true })));
    }, [actualizar]);

    const quitar = useCallback(
        (id: string) => {
            actualizar((prev) => prev.filter((a) => a.id !== id));
        },
        [actualizar],
    );

    // Conecta `notify` (usable también fuera de React) con este proveedor.
    useEffect(() => {
        registrarManejador({ show: mostrar, close: cerrar, clear: limpiar });
        const timers = temporizadores.current;
        return () => {
            registrarManejador(null);
            timers.forEach((t) => clearTimeout(t));
            timers.clear();
        };
    }, [mostrar, cerrar, limpiar]);

    const host = useMemo(
        () => (
            <Box
                aria-live="polite"
                sx={{
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(560px, calc(100vw - 32px))',
                    // Por encima de diálogos (modal) y de cualquier Snackbar suelto.
                    zIndex: (theme) => theme.zIndex.snackbar + 100,
                    display: 'flex',
                    flexDirection: 'column',
                    // El contenedor no bloquea clics; cada aviso sí los recibe.
                    pointerEvents: 'none',
                }}
            >
                {avisos.map((aviso) => (
                    <Collapse
                        key={aviso.id}
                        in={!aviso.cerrando}
                        appear
                        onExited={() => quitar(aviso.id)}
                    >
                        <Box
                            sx={{ pb: 1, pointerEvents: 'auto' }}
                            // Mientras se lee (ratón encima) no se cierra sola.
                            onMouseEnter={() => cancelarTemporizador(aviso.id)}
                            onMouseLeave={() =>
                                aviso.duration !== null && programar(aviso.id, GRACIA_TRAS_HOVER)
                            }
                        >
                            <AppAlert
                                severity={aviso.severity}
                                title={aviso.title}
                                message={
                                    aviso.repeticiones > 1
                                        ? `${aviso.message} (×${aviso.repeticiones})`
                                        : aviso.message
                                }
                                onClose={() => cerrar(aviso.id)}
                            />
                        </Box>
                    </Collapse>
                ))}
            </Box>
        ),
        [avisos, cerrar, quitar, programar, cancelarTemporizador],
    );

    return (
        <>
            {children}
            {host}
        </>
    );
}
