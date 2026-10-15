import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext, type AuthContextValue } from './authContext';
import { authApi } from '../service/authApi';
import { AuthApiError, type CredencialesLogin, type UsuarioSesion } from '../types/auth.types';
import {
    EVENTO_SESION_EXPIRADA,
    guardarToken,
    limpiarToken,
    obtenerToken,
} from '../utils/auth';
import { useNotify } from '../components/notificaciones/useNotify';

/**
 * Mantiene la sesión: al abrir la app verifica el token guardado contra
 * `GET /auth/perfil`, y cierra la sesión si el servidor la rechaza (token
 * vencido, usuario borrado) o si algún servicio avisa de un 401.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
    const notify = useNotify();
    const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
    const [cargando, setCargando] = useState<boolean>(() => obtenerToken() !== null);

    // ── Verificar el token guardado al arrancar ──
    useEffect(() => {
        if (!obtenerToken()) return;
        const control = new AbortController();
        authApi
            .perfil(control.signal)
            .then(setUsuario)
            .catch((e: unknown) => {
                if (e instanceof DOMException && e.name === 'AbortError') return;
                // 401: token inválido. Sin conexión: no se puede confirmar, se pide iniciar sesión.
                limpiarToken();
                if (!(e instanceof AuthApiError) || e.status !== 401) {
                    notify.error('No se pudo verificar la sesión. Inicie sesión de nuevo.');
                }
            })
            .finally(() => {
                if (!control.signal.aborted) setCargando(false);
            });
        return () => control.abort();
    }, [notify]);

    const logout = useCallback((): void => {
        limpiarToken();
        setUsuario(null);
    }, []);

    // ── Un servicio recibió 401: la sesión ya no vale ──
    useEffect(() => {
        const alExpirar = (): void => {
            if (!obtenerToken()) return;
            logout();
            notify.warning('Su sesión ha expirado. Inicie sesión de nuevo.');
        };
        window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
        return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
    }, [logout, notify]);

    const login = useCallback(
        async (credenciales: CredencialesLogin, recordar: boolean): Promise<UsuarioSesion> => {
            const respuesta = await authApi.login(credenciales);
            guardarToken(respuesta.access_token, recordar);
            setUsuario(respuesta.usuario);
            return respuesta.usuario;
        },
        [],
    );

    const refrescar = useCallback(async (): Promise<void> => {
        if (!obtenerToken()) return;
        try {
            setUsuario(await authApi.perfil());
        } catch {
            logout();
        }
    }, [logout]);

    const value = useMemo<AuthContextValue>(
        () => ({
            usuario,
            cargando,
            login,
            logout,
            refrescar,
            tieneAcceso: (modulo: string) => !!usuario && usuario.modulos.includes(modulo),
        }),
        [usuario, cargando, login, logout, refrescar],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
