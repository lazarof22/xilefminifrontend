// src/service/tasaApi.ts

import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
});

export type MonedaTasa = string;

// ==========================================
// Interfaces de tasas
// ==========================================

export interface Tasa {
    _id: string;
    moneda: string;
    tasaBancoCentral: number;
    tasaMercadoInformal: number;
    iva?: number;
    activa: boolean;
    fechaActualizacion?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpsertTasaDto {
    tasaBancoCentral: number;
    tasaMercadoInformal: number;
    iva?: number;
    activa?: boolean;
    fechaActualizacion?: string;
}

// ==========================================
// Interfaces de monedas
// ==========================================

export interface MonedaBackend {
    _id: string;
    tipo_moneda: string;
    nombre_moneda?: string;
}

export interface CreateMonedaDto {
    tipo_moneda: string;
    nombre_moneda?: string;
}

// ==========================================
// API de tasas
// ==========================================

export const tasaApi = {
    async getByMoneda(moneda: MonedaTasa): Promise<Tasa | null> {
        try {
            const { data } = await api.get<Tasa>(
                `/tasas/moneda/${encodeURIComponent(moneda)}`,
            );

            return data;
        } catch (error: unknown) {
            if (
                axios.isAxiosError(error) &&
                error.response?.status === 404
            ) {
                return null;
            }

            throw error;
        }
    },

    async upsertByMoneda(
        moneda: MonedaTasa,
        dto: UpsertTasaDto,
    ): Promise<Tasa> {
        const { data } = await api.patch<Tasa>(
            `/tasas/moneda/${encodeURIComponent(moneda)}`,
            dto,
        );

        return data;
    },

    async findAll(): Promise<Tasa[]> {
        const { data } = await api.get<Tasa[]>("/tasas");

        return data;
    },
};

// ==========================================
// Consulta de monedas
// ==========================================

export const monedaApi = {
    async getAll(): Promise<MonedaBackend[]> {
        const { data } = await api.get<MonedaBackend[]>("/moneda");

        return [...data].sort((a, b) =>
            (a.tipo_moneda || "").localeCompare(
                b.tipo_moneda || "",
                "es",
            ),
        );
    },
};

// ==========================================
// Creación de monedas
// ==========================================

export const monedaCrudApi = {
    async create(dto: CreateMonedaDto): Promise<MonedaBackend> {
        const { data } = await api.post<MonedaBackend>(
            "/moneda",
            dto,
        );

        return data;
    },
};