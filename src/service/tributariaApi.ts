import { apiRequest } from './httpClient';

// ═══ Tipos ═══

export interface BonificacionTributaria {
    programa: string;
    sector?: string;
    /** Porcentaje (0-100) del impuesto sobre ventas con la bonificación. */
    impuestoVentasPct: number;
    activa: boolean;
}

export interface ConfiguracionTributaria {
    _id: string;
    /** Porcentaje (0-100). */
    impuestoVentasPct: number;
    /** ISO 8601. */
    vigenteDesde: string;
    activa: boolean;
    bonificaciones: BonificacionTributaria[];
    createdAt?: string;
}

export interface GuardarConfiguracionTributariaDto {
    impuestoVentasPct: number;
    /** AAAA-MM-DD; por defecto el backend usa hoy. */
    vigenteDesde?: string;
    bonificaciones?: BonificacionTributaria[];
}

// ═══ API ═══

export const tributariaApi = {
    /** Configuración vigente, o `null` si todavía no se configuró. */
    obtenerActiva: () => apiRequest<ConfiguracionTributaria | null>('/configuracion-tributaria'),
    /** Todas las configuraciones (auditoría), la más reciente primero. */
    historial: () => apiRequest<ConfiguracionTributaria[]>('/configuracion-tributaria/historial'),
    guardar: (dto: GuardarConfiguracionTributariaDto) =>
        apiRequest<ConfiguracionTributaria>('/configuracion-tributaria', {
            method: 'PUT',
            body: JSON.stringify(dto),
        }),
};
