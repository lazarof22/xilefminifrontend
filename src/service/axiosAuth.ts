import type { AxiosInstance } from 'axios';
import { avisarLicenciaInvalida, esLicenciaInvalida, obtenerToken } from '../utils/auth';

/**
 * Añade a una instancia de axios el token de la sesión en cada petición, para
 * que los servicios que no usan `apiRequest` también lleguen autenticados al
 * backend. Devuelve la misma instancia.
 */
export function conTokenDeSesion(instancia: AxiosInstance): AxiosInstance {
    instancia.interceptors.request.use((config) => {
        const token = obtenerToken();
        if (token && !config.headers.has('Authorization')) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }
        return config;
    });
    instancia.interceptors.response.use(undefined, (error: unknown) => {
        const respuesta = (error as { response?: { status?: number; data?: unknown } }).response;
        if (respuesta?.status === 403 && esLicenciaInvalida(respuesta.data)) avisarLicenciaInvalida();
        return Promise.reject(error);
    });
    return instancia;
}
