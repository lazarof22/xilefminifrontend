// src/service/tasaApi.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Las monedas vienen ahora del nomenclador MONEDA.
 * Por eso debe ser string y no un union type fijo.
 */
export type MonedaTasa = string;

export interface Tasa {
  _id: string;
  moneda: MonedaTasa;
  tasaBancoCentral: number;
  tasaMercadoInformal: number;
  iva?: number;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertTasaDto {
  tasaBancoCentral: number;
  tasaMercadoInformal: number;
  iva?: number;
  activa?: boolean;
}

/**
 * Estructura de un documento de la colección nomencladores_valores.
 */
export interface NomencladorValor {
  _id: string;
  nomencladorId: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export const tasaApi = {
  async getByMoneda(moneda: MonedaTasa): Promise<Tasa | null> {
    try {
      const { data } = await api.get<Tasa>(
        `/tasas/moneda/${encodeURIComponent(moneda)}`,
      );

      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
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

export const nomencladorApi = {
  async getMonedas(): Promise<NomencladorValor[]> {
    const { data } = await api.get<NomencladorValor[]>(
      "/nomencladores/MONEDA/valores",
    );

    return data
      .filter((valor) => valor.activo)
      .sort((a, b) => {
        const ordenA = a.orden ?? 0;
        const ordenB = b.orden ?? 0;

        if (ordenA !== ordenB) {
          return ordenA - ordenB;
        }

        return a.nombre.localeCompare(b.nombre, "es");
      });
  },
};