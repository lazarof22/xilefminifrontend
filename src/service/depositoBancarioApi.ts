import { apiRequest } from './httpClient';

export interface DepositoBancario {
    _id: string;
    turnoCajaId: string;
    monto: number;
    moneda: string;
    banco: string;
    referencia?: string;
    fecha: string;
}

export interface CrearDepositoDto {
    turnoCajaId: string;
    monto: number;
    moneda?: string;
    banco: string;
    referencia?: string;
    fecha?: string;
}

export interface AlertaDeposito {
    tipo: 'turno_sin_deposito' | 'maximo_dias_entre_depositos';
    mensaje: string;
    turnoCajaId?: string;
    fechaLimite?: string;
    ultimoDeposito?: string;
    diasTranscurridos?: number;
    maximo?: number;
}

/** `activas: false` (valor por defecto) significa que la norma aún no se activó. */
export interface RespuestaAlertas {
    activas: boolean;
    alertas: AlertaDeposito[];
    plazoDiasHabiles?: number;
    maxDiasEntreDepositos?: number;
}

export interface ConfiguracionDeposito {
    alertasActivas: boolean;
    plazoDiasHabiles: number;
    maxDiasEntreDepositos: number;
}

export const listarDepositos = (turnoCajaId?: string) =>
    apiRequest<DepositoBancario[]>(
        turnoCajaId ? `/deposito-bancario?turnoCajaId=${encodeURIComponent(turnoCajaId)}` : '/deposito-bancario',
    );

export const crearDeposito = (dto: CrearDepositoDto) =>
    apiRequest<DepositoBancario>('/deposito-bancario', { method: 'POST', body: JSON.stringify(dto) });

export const obtenerAlertasDeposito = () => apiRequest<RespuestaAlertas>('/deposito-bancario/alertas');

export const obtenerConfiguracionDeposito = () =>
    apiRequest<ConfiguracionDeposito>('/deposito-bancario/configuracion');

export const actualizarConfiguracionDeposito = (dto: Partial<ConfiguracionDeposito>) =>
    apiRequest<ConfiguracionDeposito>('/deposito-bancario/configuracion', {
        method: 'PUT',
        body: JSON.stringify(dto),
    });
