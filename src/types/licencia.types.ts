// ═══ Tipos del módulo de licencia (contrato del backend) ═══

export const ESTADOS_LICENCIA = [
    'valida',
    'sin_licencia',
    'version_no_soportada',
    'formato_invalido',
    'firma_invalida',
    'hardware_no_coincide',
    'empresa_no_coincide',
    'reloj_alterado',
    'estado_alterado',
    'revocada',
    'inactiva',
    'no_iniciada',
    'expirada',
    'error_interno',
] as const;

export type EstadoCodigo = (typeof ESTADOS_LICENCIA)[number];

export type CodigoRechazo =
    | 'formato_invalido'
    | 'version_no_soportada'
    | 'firma_invalida'
    | 'expirada'
    | 'hardware_no_coincide'
    | 'empresa_no_coincide'
    | 'reloj_alterado'
    | 'estado_alterado'
    | 'secuencia_obsoleta'
    | 'archivo_no_escrito'
    | 'error_interno'
    | 'cupo_usuarios_excedido'
    | 'licencia_invalida';

export type TipoLicencia = string;

// ═══ Respuestas de estado ═══

export interface EstadoPublico {
    valida: boolean;
    estado: EstadoCodigo;
}

export interface EstadoUsuario extends EstadoPublico {
    tipo: TipoLicencia | null;
    perpetua: boolean;
    fecha_vencimiento: string | null;
    dias_restantes: number | null;
}

// Con firma inválida el backend no expone los datos del payload: llegan como null.
export interface EstadoLicencia extends EstadoUsuario {
    license_id: string | null;
    empresa_id: string | null;
    fecha_inicio: string | null;
    max_usuarios: number | null;
    secuencia: number | null;
    emitida_en: string | null;
    activa: boolean | null;
    revocada: boolean | null;
}

/** Elemento de `GET /licencia` y respuesta de `GET /licencia/:empresaId`. */
export interface LicenciaAdmin extends EstadoLicencia {
    importada_en: string | null;
}

// ═══ Solicitud (.req) ═══

export interface SolicitudLicencia {
    version: 1;
    empresa_id: string;
    hardware_fingerprint: string;
    generada_en: string;
}

export interface ArchivoDescargado {
    nombre: string;
    contenido: Blob;
}

// ═══ Artefacto firmado (.lic) ═══

export interface PayloadLicencia {
    activa: boolean;
    emitida_en: string;
    empresa_id: string;
    fecha_inicio: string;
    fecha_vencimiento: string | null;
    hardware_fingerprint: string;
    license_id: string;
    max_usuarios: number;
    revocada: boolean;
    secuencia: number;
    tipo: TipoLicencia;
}

export interface ArtefactoLicencia {
    version_firma: 3;
    payload: PayloadLicencia;
    firma: string;
}

export type ResultadoActivacion =
    | 'activada'
    | 'actualizada'
    | 'revocada'
    | 'reimportada';

export interface RespuestaActivacion {
    mensaje: string;
    resultado: ResultadoActivacion;
    licencia: EstadoLicencia;
}

// ═══ Errores ═══

export interface CuerpoErrorApi {
    statusCode?: number;
    message?: string | string[];
    codigo?: string;
}

export class LicenciaApiError extends Error {
    readonly status: number;
    readonly codigo?: string;
    readonly mensaje: string;

    constructor(status: number, mensaje: string, codigo?: string) {
        super(mensaje);
        this.name = 'LicenciaApiError';
        this.status = status;
        this.mensaje = mensaje;
        this.codigo = codigo;
    }
}

// ═══ Presentación ═══

export type SeveridadLicencia = 'success' | 'info' | 'warning' | 'error';

export interface DescripcionEstado {
    etiqueta: string;
    descripcion: string;
    severidad: SeveridadLicencia;
    color: SeveridadLicencia;
}
