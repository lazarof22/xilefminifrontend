
// services/nomencladoresApi.ts

import axios from "axios";

export interface Nomenclador {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
  esSistema?: boolean;
  cantidadValores?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NomencladorValor {
  _id: string;
  nomencladorId: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrearNomencladorDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
  esSistema?: boolean;
}

export interface CrearValorDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden: number;
}

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Si tu backend utiliza JWT, agrega aquí el token
// mediante un interceptor o tu mecanismo actual de autenticación.

export const nomencladoresApi = {
  async listar(): Promise<Nomenclador[]> {
    const { data } = await api.get("/nomencladores");
    return data;
  },

  async crear(
    dto: CrearNomencladorDto,
  ): Promise<Nomenclador> {
    const { data } = await api.post(
      "/nomencladores",
      dto,
    );
    return data;
  },

  async actualizar(
    id: string,
    dto: Partial<CrearNomencladorDto>,
  ): Promise<Nomenclador> {
    const { data } = await api.patch(
      `/nomencladores/${id}`,
      dto,
    );
    return data;
  },

  async cambiarEstado(
    id: string,
    activo: boolean,
  ): Promise<Nomenclador> {
    const { data } = await api.patch(
      `/nomencladores/${id}/estado`,
      { activo },
    );
    return data;
  },

  async listarValores(
    codigo: string,
    incluirInactivos = true,
  ): Promise<NomencladorValor[]> {
    const endpoint = incluirInactivos
      ? `/nomencladores/${codigo}/valores/todos`
      : `/nomencladores/${codigo}/valores`;

    const { data } = await api.get(endpoint);
    return data;
  },

  async crearValor(
    codigo: string,
    dto: CrearValorDto,
  ): Promise<NomencladorValor> {
    const { data } = await api.post(
      `/nomencladores/${codigo}/valores`,
      dto,
    );
    return data;
  },

  async actualizarValor(
    id: string,
    dto: Partial<CrearValorDto>,
  ): Promise<NomencladorValor> {
    const { data } = await api.patch(
      `/nomencladores/valores/${id}`,
      dto,
    );
    return data;
  },

  async cambiarEstadoValor(
    id: string,
    activo: boolean,
  ): Promise<NomencladorValor> {
    const { data } = await api.patch(
      `/nomencladores/valores/${id}/estado`,
      { activo },
    );
    return data;
  },
};