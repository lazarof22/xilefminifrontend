import { apiRequest } from './httpClient';

/**
 * Nomencladores de producto. Cada uno vive en su propio módulo del backend
 * (carpeta `modules/nomencladores/<nombre>`) con su propio endpoint:
 *   - Categoría de producto → /categoria  { nombre_categoria }
 *   - Estado de producto    → /estado     { estado }
 *
 * Para los selects se normalizan a `{ _id, nombre }`. El valor que se guarda
 * en el producto es el `nombre`, que es el texto que se muestra en el catálogo.
 */
export interface OpcionNomenclador {
    _id: string;
    nombre: string;
}

/** Operaciones que necesita un select con botón "+" (ver SelectNomenclador). */
export interface NomencladorApi {
    listar: () => Promise<OpcionNomenclador[]>;
    crear: (nombre: string) => Promise<OpcionNomenclador>;
}

const porNombre = (a: OpcionNomenclador, b: OpcionNomenclador) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });

/** Crea el cliente de un nomenclador cuyo documento guarda el nombre en `campo`. */
function crearNomencladorApi(ruta: string, campo: string): NomencladorApi {
    type Documento = { _id: string } & Record<string, string>;
    const aOpcion = (d: Documento): OpcionNomenclador => ({ _id: d._id, nombre: d[campo] });

    return {
        async listar() {
            const datos = await apiRequest<Documento[]>(ruta);
            return datos.map(aOpcion).sort(porNombre);
        },
        async crear(nombre) {
            const creado = await apiRequest<Documento>(ruta, {
                method: 'POST',
                body: JSON.stringify({ [campo]: nombre.trim() }),
            });
            return aOpcion(creado);
        },
    };
}

export const categoriasProductoApi = crearNomencladorApi('/categoria', 'nombre_categoria');
export const estadosProductoApi = crearNomencladorApi('/estado', 'estado');
export const causasDisminucionApi = crearNomencladorApi('/causa-disminucion', 'nombre_causa');
