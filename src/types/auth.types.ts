// ═══ Tipos de autenticación (contrato del backend) ═══

export interface CredencialesLogin {
    correo_empleado: string;
    contraseña: string;
}

export interface RespuestaLogin {
    access_token: string;
}

/** Payload del JWT emitido por `POST /auth/login`. */
export interface PayloadToken {
    sub?: string;
    correo_empleado?: string;
    nombre_empleado?: string;
    rol?: string;
    empresa_id?: string;
}

export class AuthApiError extends Error {
    readonly status: number;

    constructor(status: number, mensaje: string) {
        super(mensaje);
        this.name = 'AuthApiError';
        this.status = status;
    }
}
