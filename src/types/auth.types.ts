// ═══ Tipos de autenticación (contrato del backend) ═══

export interface CredencialesLogin {
    nombre: string;
    contraseña: string;
}

/** Usuario de la sesión tal y como lo devuelve el backend (rol y módulos ya resueltos). */
export interface UsuarioSesion {
    id: string;
    nombre: string;
    rol: string;
    /** Módulos permitidos. Para el administrador vienen todos. */
    modulos: string[];
}

export interface RespuestaLogin {
    access_token: string;
    usuario: UsuarioSesion;
}

export class AuthApiError extends Error {
    readonly status: number;

    constructor(status: number, mensaje: string) {
        super(mensaje);
        this.name = 'AuthApiError';
        this.status = status;
    }
}
