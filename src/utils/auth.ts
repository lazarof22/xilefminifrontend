import type { UsuarioSesion } from '../types/auth.types';
import { MODULOS } from '../types/usuarios.types';

// ═══ Sesión local ═══
// "Recordarme" guarda el token en localStorage (sobrevive al cerrar el navegador);
// sin marcarlo, en sessionStorage (se pierde al cerrar la pestaña).

export const CLAVE_TOKEN = 'token';

function leer(almacen: () => Storage, clave: string): string | null {
    try {
        return almacen().getItem(clave);
    } catch {
        return null;
    }
}

export function obtenerToken(): string | null {
    return leer(() => sessionStorage, CLAVE_TOKEN) ?? leer(() => localStorage, CLAVE_TOKEN);
}

export function guardarToken(token: string, recordar = true): void {
    limpiarToken();
    try {
        (recordar ? localStorage : sessionStorage).setItem(CLAVE_TOKEN, token);
    } catch {
        // Sin almacenamiento: la sesión vive solo en memoria hasta recargar.
    }
}

export function limpiarToken(): void {
    try {
        localStorage.removeItem(CLAVE_TOKEN);
        sessionStorage.removeItem(CLAVE_TOKEN);
    } catch {
        // nada que limpiar
    }
}

/** Evento que cualquier servicio dispara al recibir un 401 con sesión iniciada. */
export const EVENTO_SESION_EXPIRADA = 'xilef:sesion-expirada';

export function avisarSesionExpirada(): void {
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
}

/** Cabeceras con el token, para los servicios que usan fetch. */
export function cabecerasAuth(): Record<string, string> {
    const token = obtenerToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** ¿El usuario puede entrar a ese módulo? (la autorización real la aplica el servidor). */
export function puedeAccederAModulo(usuario: UsuarioSesion | null, modulo: string): boolean {
    return !!usuario && usuario.modulos.includes(modulo);
}

/** Primer módulo al que el usuario puede entrar (su "inicio"), o null si no tiene ninguno. */
export function rutaInicio(modulos: readonly string[]): string | null {
    const primero = MODULOS.find((m) => modulos.includes(m.value));
    return primero ? `/${primero.value}` : null;
}

// ═══ Lectura del JWT (NO autoritativa) ═══
// Decodifica el payload sin verificar la firma. Solo sirve para leer datos que
// el token trae (p. ej. `empresa_id` de licencias por empresa); los permisos
// reales los aplica el servidor.

export interface PayloadToken {
    sub?: string;
    nombre?: string;
    rol?: string;
    empresa_id?: string;
}

function decodificarBase64Url(segmento: string): string {
    const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binario = atob(relleno);
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function textoOpcional(valor: unknown): string | undefined {
    return typeof valor === 'string' && valor ? valor : undefined;
}

export function leerPayloadToken(token: string | null | undefined): PayloadToken | null {
    if (!token) return null;
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    try {
        const datos: unknown = JSON.parse(decodificarBase64Url(partes[1]));
        if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) return null;
        const registro = datos as Record<string, unknown>;
        return {
            sub: textoOpcional(registro.sub),
            nombre: textoOpcional(registro.nombre),
            rol: textoOpcional(registro.rol),
            empresa_id: textoOpcional(registro.empresa_id),
        };
    } catch {
        return null;
    }
}

export function payloadSesionActual(): PayloadToken | null {
    return leerPayloadToken(obtenerToken());
}
