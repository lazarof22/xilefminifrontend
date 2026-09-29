import axios from 'axios';

interface Almacen {
    codigoAlmacen: string;
    nombreAlmacen: string
    cantidadContenedores: number;
}

interface CreateAlmacenDto {
    codigoAlmacen: string;
    nombreAlmacen: string;
    cantidadContenedores: number;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
    },
});



export interface Contenedor {
    _id?: string;
    codigoContenedor: string;
    nombreContenedor: string;
    almacen: string | { _id: string; codigoAlmacen?: string; nombreAlmacen?: string };
    productosCount?: number;
}

export interface CreateContenedorDto {
    codigoContenedor: string;
    nombreContenedor: string;
    almacen: string;
}

export const AlmacenApi = {
    async listar(): Promise<Almacen[]> {
        const { data } = await api.get("/almacen");
        return data;
    },

    async crear(dto: CreateAlmacenDto): Promise<Almacen> {
        const { data } = await api.post("/almacen", dto);
        return data;
    },

    async listarContenedores(): Promise<Contenedor[]> {
        const { data } = await api.get("/contenedor");
        return data;
    },

    async crearContenedor(dto: CreateContenedorDto): Promise<Contenedor> {
        const { data } = await api.post("/contenedor", dto);
        return data;
    },

    async eliminarContenedor(id: string): Promise<void> {
        await api.delete(`/contenedor/${id}`);
    },
}