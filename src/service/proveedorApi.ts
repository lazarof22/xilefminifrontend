// src/service/proveedorApi.ts
import axios from 'axios';
import { BASE_URL } from './apiConfig';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

export interface ProveedorBackend {
    _id: string;
    codigo: string;
    nombre: string;
    cuentaBancaria: string;
    direccion: string;
    telefono: number;
    createdAt?: string;
}

export interface CrearProveedorDto {
    codigo: string;
    nombre: string;
    cuentaBancaria: string;
    direccion: string;
    telefono: number;
}

export const proveedorApi = {
    async getAll(): Promise<ProveedorBackend[]> {
        const { data } = await api.get<ProveedorBackend[]>('/proveedores');
        return data;
    },

    async crear(dto: CrearProveedorDto): Promise<ProveedorBackend> {
        const { data } = await api.post<ProveedorBackend>('/proveedores', dto);
        return data;
    },
};
