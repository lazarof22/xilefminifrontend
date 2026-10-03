import { AuthApiError, type CredencialesLogin, type RespuestaLogin } from '../types/auth.types';
import { BASE_URL } from './apiConfig';

// ═══ Helpers privados ═══

function esRespuestaLogin(valor: unknown): valor is RespuestaLogin {
    return (
        typeof valor === 'object' &&
        valor !== null &&
        typeof (valor as Record<string, unknown>).access_token === 'string' &&
        (valor as Record<string, unknown>).access_token !== ''
    );
}

// ═══ API pública ═══

export const authApi = {
    async login(credenciales: CredencialesLogin, signal?: AbortSignal): Promise<RespuestaLogin> {
        let respuesta: Response;
        try {
            respuesta = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(credenciales),
                signal,
            });
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') throw e;
            throw new AuthApiError(0, 'No se pudo conectar con el servidor');
        }

        if (respuesta.status === 401) throw new AuthApiError(401, 'Correo o contraseña incorrectos');
        if (!respuesta.ok) throw new AuthApiError(respuesta.status, `Error ${respuesta.status} al iniciar sesión`);

        let cuerpo: unknown;
        try {
            cuerpo = await respuesta.json();
        } catch {
            cuerpo = null;
        }
        if (!esRespuestaLogin(cuerpo)) {
            throw new AuthApiError(respuesta.status, 'Respuesta de inicio de sesión inválida');
        }
        return cuerpo;
    },
};
