import type { PayloadToken } from '../types/auth.types';

// ═══ Sesión local ═══

export const CLAVE_TOKEN = 'token';

export const ROL_ADMINISTRADOR = 'administrador';

export function obtenerToken(): string | null {
    try {
        return localStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
}

export function guardarToken(token: string): void {
    localStorage.setItem(CLAVE_TOKEN, token);
}

export function borrarToken(): void {
    try {
        localStorage.removeItem(CLAVE_TOKEN);
    } catch {
        // Sin almacenamiento disponible no hay sesión que borrar.
    }
}

// ═══ Lectura del JWT (NO autoritativa) ═══
// Decodifica el payload sin verificar la firma. Solo sirve para decidir qué
// mostrar o a qué ruta llamar; la autorización real la aplica el servidor.

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
            correo_empleado: textoOpcional(registro.correo_empleado),
            nombre_empleado: textoOpcional(registro.nombre_empleado),
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
