// src/service/compraApi.ts
import axios from 'axios';
import { BASE_URL } from './apiConfig';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// ─── Tipos ────────────────────────────────────────────

export type MetodoPago = 'efectivo' | 'transferencia' | 'credito';

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'credito', label: 'Crédito' },
];

export interface CompraBackend {
    _id: string;
    numeroFactura: string;
    nombreProveedor: string;
    nombreProducto: string;
    fechaCompra: string;
    moneda: string;
    tasaMercadoInformal?: number;
    tasaBancoNacional?: number;
    precioCompra: number;
    cantidad: number;
    iva: number;
    totalPagado: number;
    metodoPago: MetodoPago;
}

export interface CrearCompraDto {
    numeroFactura: string;
    nombreProveedor: string;
    nombreProducto: string;
    /** AAAA-MM-DD */
    fechaCompra: string;
    moneda: string;
    tasaMercadoInformal?: number;
    tasaBancoNacional?: number;
    precioCompra: number;
    cantidad: number;
    iva: number;
    metodoPago: MetodoPago;
}

/** Proveedor tal y como lo devuelve GET /empresa. */
export interface ProveedorBackend {
    _id: string;
    nombreEmpresa: string;
    tipoEmpresa: string;
}

// ─── API ──────────────────────────────────────────────

export const compraApi = {
    async getAll(): Promise<CompraBackend[]> {
        const { data } = await api.get<CompraBackend[]>('/compra');
        return data;
    },

    async crear(dto: CrearCompraDto): Promise<CompraBackend> {
        const { data } = await api.post<CompraBackend>('/compra', dto);
        return data;
    },
};

export const proveedorApi = {
    async getAll(): Promise<ProveedorBackend[]> {
        const { data } = await api.get<ProveedorBackend[]>('/empresa');
        return [...data].sort((a, b) =>
            (a.nombreEmpresa || '').localeCompare(b.nombreEmpresa || '', 'es'),
        );
    },
};

/** Mypime usa la tasa del mercado informal; el resto, la del banco nacional. */
export const esMypime = (tipoEmpresa?: string): boolean =>
    (tipoEmpresa ?? '').toLowerCase() === 'mypime';

export const esMonedaLocal = (moneda: string): boolean =>
    moneda.trim().toUpperCase() === 'CUP';
