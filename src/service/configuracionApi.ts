import { BASE_URL } from './apiConfig';
import { obtenerToken } from '../utils/auth';

// ═══ Tipos ═══

export interface EmpresaDatos {
    nombre: string;
    eslogan: string;
    direccion: string;
    telefono: string;
    email: string;
    ruc_nit: string;
    ciudad: string;
    /** ObjectId del país (nomenclador Pais). */
    pais: string;
}

export interface EmpresaDatosBackend extends Partial<EmpresaDatos> {
    _id?: string;
    logo?: string;
}

export type UsuarioRol = 'administrador' | 'empleado' | 'jefe' | 'facturador' | 'cajero';

export interface UsuarioBackend {
    _id: string;
    ci_empleado: string;
    nombre_empleado: string;
    correo_empleado: string;
    departamento: string;
    cargo: string;
    salario: number;
    rol: UsuarioRol;
    createdAt?: string;
}

export interface CrearUsuarioDto {
    ci_empleado: string;
    nombre_empleado: string;
    correo_empleado: string;
    contraseña: string;
    /** Nombre o ObjectId; el backend crea el nomenclador si no existe. */
    departamento: string;
    /** Nombre o ObjectId; el backend crea el nomenclador si no existe. */
    cargo: string;
    salario: number;
    rol?: UsuarioRol;
}

export interface ResultadoImportacion {
    imported: number;
    errors: string[];
}

export interface Pais {
    _id: string;
    nombrePais: string;
}

export interface Ciudad {
    _id: string;
    nombreCiudad: string;
    pais: Pais | string;
}

// ═══ Cliente HTTP ═══

async function request<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const headers = new Headers(opciones.headers);
    headers.set('Accept', 'application/json');
    if (opciones.body !== undefined) headers.set('Content-Type', 'application/json');
    const token = obtenerToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const respuesta = await fetch(`${BASE_URL}${ruta}`, { ...opciones, headers });
    const texto = await respuesta.text();
    let datos: unknown = null;
    if (texto) {
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = texto;
        }
    }

    if (!respuesta.ok) {
        const mensaje =
            datos && typeof datos === 'object' && 'message' in datos
                ? (datos as { message: string | string[] }).message
                : null;
        throw new Error(
            Array.isArray(mensaje) ? mensaje.join('. ') : mensaje || `Error HTTP ${respuesta.status}`,
        );
    }
    return datos as T;
}

const json = (body: unknown): string => JSON.stringify(body);

// ═══ API pública ═══

export const configuracionApi = {
    // Empresa (empresa-datos)
    obtenerEmpresa: () => request<EmpresaDatosBackend | null>('/empresa'),
    guardarEmpresa: (datos: Partial<EmpresaDatos> & { logo?: string }) =>
        request<EmpresaDatosBackend>('/empresa', { method: 'PUT', body: json(datos) }),
    subirLogo: (logo: string) =>
        request<EmpresaDatosBackend>('/empresa/logo', { method: 'POST', body: json({ logo }) }),

    // Usuarios
    listarUsuarios: () => request<UsuarioBackend[]>('/usuarios'),
    crearUsuario: (dto: CrearUsuarioDto) =>
        request<UsuarioBackend>('/usuarios', { method: 'POST', body: json(dto) }),
    eliminarUsuario: (id: string) => request<void>(`/usuarios/${id}`, { method: 'DELETE' }),

    // Importación / exportación
    importarProductosCsv: (csv: string) =>
        request<ResultadoImportacion>('/importar/csv', { method: 'POST', body: json({ csv }) }),
    importarCuentasCsv: (csv: string) =>
        request<ResultadoImportacion>('/importar/csv/cuentas', { method: 'POST', body: json({ csv }) }),
    exportarRespaldo: () => request<Record<string, unknown[]>>('/respaldo/exportar'),
    importarRespaldo: (data: Record<string, unknown[]>) =>
        request<ResultadoImportacion>('/respaldo/importar', { method: 'POST', body: json(data) }),

    // Nomencladores: país y ciudad
    listarPaises: () => request<Pais[]>('/pais'),
    crearPais: (nombrePais: string) =>
        request<Pais>('/pais', { method: 'POST', body: json({ nombrePais }) }),
    listarCiudades: (paisId?: string) =>
        request<Ciudad[]>(paisId ? `/ciudad?pais=${encodeURIComponent(paisId)}` : '/ciudad'),
    crearCiudad: (nombreCiudad: string, pais: string) =>
        request<Ciudad>('/ciudad', { method: 'POST', body: json({ nombreCiudad, pais }) }),
};

export const idPaisDeCiudad = (ciudad: Ciudad): string =>
    typeof ciudad.pais === 'string' ? ciudad.pais : ciudad.pais._id;
