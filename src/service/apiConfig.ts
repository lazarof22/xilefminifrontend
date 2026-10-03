// ═══ Configuración compartida de la API ═══

// El backend no usa prefijo global: las rutas cuelgan directamente de la base.
export const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
