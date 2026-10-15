import { createContext, useContext } from 'react';
import type { CredencialesLogin, UsuarioSesion } from '../types/auth.types';

export interface AuthContextValue {
    /** Usuario con sesión iniciada (null si no hay). */
    usuario: UsuarioSesion | null;
    /** true mientras se verifica el token guardado al abrir la app. */
    cargando: boolean;
    login: (credenciales: CredencialesLogin, recordar: boolean) => Promise<UsuarioSesion>;
    logout: () => void;
    /** Vuelve a leer rol y módulos del servidor (p. ej. tras editar al propio usuario). */
    refrescar: () => Promise<void>;
    tieneAcceso: (modulo: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    return ctx;
}
