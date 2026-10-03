import dayjs from 'dayjs';
import {
    LicenciaApiError,
    type ArtefactoLicencia,
    type CodigoRechazo,
    type DescripcionEstado,
    type EstadoCodigo,
    type EstadoLicencia,
    type EstadoPublico,
    type EstadoUsuario,
    type LicenciaAdmin,
    type PayloadLicencia,
    type ResultadoActivacion,
    type SeveridadLicencia,
} from '../types/licencia.types';

// ═══ Constantes ═══

export const MENSAJE_SIN_PERMISOS =
    'Inicia sesión como administrador para gestionar la licencia';

export const TAMANO_MAXIMO_LIC = 64 * 1024;

/** Días restantes por debajo de los cuales se avisa del vencimiento. */
export const DIAS_AVISO_VENCIMIENTO = 30;

// ═══ Descripciones de estado y rechazo ═══

function describir(
    etiqueta: string,
    descripcion: string,
    severidad: SeveridadLicencia,
): DescripcionEstado {
    return { etiqueta, descripcion, severidad, color: severidad };
}

const DESCRIPCIONES: Record<EstadoCodigo | CodigoRechazo, DescripcionEstado> = {
    valida: describir('Válida', 'La licencia está activa y verificada', 'success'),
    sin_licencia: describir('Sin licencia', 'No hay ninguna licencia instalada en este equipo', 'warning'),
    version_no_soportada: describir('Versión no soportada', 'El archivo de licencia usa una versión de firma no soportada', 'error'),
    formato_invalido: describir('Formato inválido', 'El archivo de licencia está dañado o incompleto', 'error'),
    firma_invalida: describir('Firma inválida', 'La firma de la licencia no es auténtica', 'error'),
    hardware_no_coincide: describir('Otro equipo', 'La licencia fue emitida para otro equipo', 'error'),
    empresa_no_coincide: describir('Otra empresa', 'La licencia fue emitida para otra empresa', 'error'),
    reloj_alterado: describir('Reloj alterado', 'Se detectó que el reloj del sistema fue atrasado', 'error'),
    estado_alterado: describir('Estado alterado', 'Se detectó una modificación no autorizada del estado de la licencia', 'error'),
    revocada: describir('Revocada', 'La licencia fue revocada por XILEF', 'error'),
    inactiva: describir('Inactiva', 'La licencia está desactivada', 'warning'),
    no_iniciada: describir('No iniciada', 'La licencia todavía no ha entrado en vigor', 'info'),
    expirada: describir('Expirada', 'La licencia ha vencido', 'error'),
    secuencia_obsoleta: describir('Licencia obsoleta', 'Esta licencia es más antigua que la instalada', 'warning'),
    archivo_no_escrito: describir('Error al guardar', 'El servidor no pudo guardar el archivo de licencia', 'error'),
    error_interno: describir('Error interno', 'Ocurrió un error interno al verificar la licencia', 'error'),
    cupo_usuarios_excedido: describir('Cupo de usuarios agotado', 'Se alcanzó el número máximo de usuarios permitido por la licencia', 'warning'),
    licencia_invalida: describir('Licencia no válida', 'La licencia no es válida; no se pueden crear usuarios', 'error'),
};

const DESCRIPCION_DESCONOCIDA = describir('Desconocido', 'Estado de licencia no reconocido', 'warning');

export function describirEstado(codigo: string | null | undefined): DescripcionEstado {
    if (!codigo) return DESCRIPCION_DESCONOCIDA;
    return (DESCRIPCIONES as Record<string, DescripcionEstado | undefined>)[codigo] ?? DESCRIPCION_DESCONOCIDA;
}

export const MENSAJES_RESULTADO: Record<ResultadoActivacion, { mensaje: string; severidad: SeveridadLicencia }> = {
    activada: { mensaje: 'Licencia activada correctamente', severidad: 'success' },
    actualizada: { mensaje: 'Licencia actualizada correctamente', severidad: 'success' },
    revocada: { mensaje: 'La licencia fue revocada en este equipo', severidad: 'warning' },
    reimportada: { mensaje: 'La licencia ya estaba instalada; se reimportó sin cambios', severidad: 'info' },
};

// ═══ Errores ═══

export function esErrorDePermisos(e: unknown): boolean {
    return e instanceof LicenciaApiError && (e.status === 401 || e.status === 403) && !e.codigo;
}

export function mensajeDeError(e: unknown, porDefecto: string): string {
    if (e instanceof LicenciaApiError) {
        if (e.codigo) return describirEstado(e.codigo).descripcion;
        if (esErrorDePermisos(e)) return MENSAJE_SIN_PERMISOS;
        return e.mensaje || porDefecto;
    }
    if (e instanceof Error && e.message) return e.message;
    return porDefecto;
}

// ═══ Valores opcionales ═══

/** Texto para mostrar un valor que el backend puede enviar como null (p. ej. con firma inválida). */
export function textoOGuion(valor: string | number | null | undefined): string {
    return valor == null || valor === '' ? '—' : String(valor);
}

// ═══ Selección de licencia (admin) ═══

function marcaTiempo(valor: string | null | undefined): number {
    if (!valor) return Number.NEGATIVE_INFINITY;
    const ms = dayjs(valor).valueOf();
    return Number.isFinite(ms) ? ms : Number.NEGATIVE_INFINITY;
}

/** Elige la licencia a mostrar de `GET /licencia`: primero las válidas, luego la importada más recientemente. */
export function elegirLicencia(licencias: readonly LicenciaAdmin[]): LicenciaAdmin | null {
    let elegida: LicenciaAdmin | null = null;
    for (const actual of licencias) {
        if (
            elegida === null ||
            (actual.valida && !elegida.valida) ||
            (actual.valida === elegida.valida && marcaTiempo(actual.importada_en) > marcaTiempo(elegida.importada_en))
        ) {
            elegida = actual;
        }
    }
    return elegida;
}

// ═══ Fechas ═══

export function formatearFecha(valor: string | null | undefined, conHora = false): string {
    if (!valor) return '—';
    const fecha = dayjs(valor);
    if (!fecha.isValid()) return '—';
    return fecha.format(conHora ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY');
}

export function esPerpetua(tipo: string | null | undefined, fechaVencimiento: string | null | undefined): boolean {
    return tipo === 'perpetua' && fechaVencimiento === null;
}

/** Devuelve el estado con datos de vigencia (detalle de admin o estado de usuario), o null si solo hay estado público. */
export function estadoCompleto(
    estado: EstadoUsuario | EstadoPublico | null,
    detalle: EstadoLicencia | null,
): EstadoUsuario | null {
    if (detalle) return detalle;
    return estado !== null && 'dias_restantes' in estado ? estado : null;
}

/** Porcentaje (0–100) de vigencia restante; null si no aplica (perpetua o sin datos). */
export function porcentajeRestante(
    fechaInicio: string | null | undefined,
    fechaVencimiento: string | null | undefined,
    diasRestantes: number | null | undefined,
): number | null {
    if (diasRestantes == null || !fechaVencimiento) return null;
    const total = fechaInicio
        ? dayjs(fechaVencimiento).diff(dayjs(fechaInicio), 'day')
        : 365;
    if (!Number.isFinite(total) || total <= 0) return null;
    return Math.min(100, Math.max(0, (diasRestantes / total) * 100));
}

// ═══ Lectura estructural del artefacto .lic ═══
// Solo valida la forma del JSON. La autenticidad (firma, equipo, empresa,
// vigencia) la decide exclusivamente el servidor.

function esObjeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

const CAMPOS_TEXTO = ['emitida_en', 'empresa_id', 'fecha_inicio', 'hardware_fingerprint', 'license_id', 'tipo'] as const;
const CAMPOS_BOOLEANOS = ['activa', 'revocada'] as const;
const CAMPOS_NUMERICOS = ['max_usuarios', 'secuencia'] as const;

function esPayloadLicencia(valor: unknown): valor is PayloadLicencia {
    if (!esObjeto(valor)) return false;
    return (
        CAMPOS_TEXTO.every((campo) => typeof valor[campo] === 'string') &&
        CAMPOS_BOOLEANOS.every((campo) => typeof valor[campo] === 'boolean') &&
        CAMPOS_NUMERICOS.every((campo) => typeof valor[campo] === 'number') &&
        (valor.fecha_vencimiento === null || typeof valor.fecha_vencimiento === 'string')
    );
}

export function esArtefactoLicencia(valor: unknown): valor is ArtefactoLicencia {
    return (
        esObjeto(valor) &&
        valor.version_firma === 3 &&
        typeof valor.firma === 'string' &&
        valor.firma.length > 0 &&
        esPayloadLicencia(valor.payload)
    );
}

export async function leerArtefactoLic(archivo: File): Promise<ArtefactoLicencia> {
    if (archivo.size === 0) throw new Error('El archivo está vacío');
    if (archivo.size > TAMANO_MAXIMO_LIC) throw new Error('El archivo es demasiado grande para ser una licencia');

    let datos: unknown;
    try {
        datos = JSON.parse(await archivo.text());
    } catch {
        throw new Error('El archivo no es una licencia válida (no contiene JSON)');
    }

    if (esObjeto(datos) && 'version_firma' in datos && datos.version_firma !== 3) {
        throw new Error('La versión del archivo de licencia no es compatible');
    }
    if (!esArtefactoLicencia(datos)) {
        throw new Error('El archivo de licencia está incompleto o tiene campos inválidos');
    }

    // Se reenvía solo la forma esperada, sin campos extra.
    return { version_firma: 3, payload: datos.payload, firma: datos.firma };
}

// ═══ Descarga de archivos ═══

export function descargarBlob(contenido: Blob, nombre: string): void {
    const url = URL.createObjectURL(contenido);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    // Se libera tras el ciclo actual para no cancelar la descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
