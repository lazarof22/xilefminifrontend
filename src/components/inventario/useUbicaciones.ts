import { useCallback, useEffect, useState } from 'react';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { movimientosApi, type AlmacenBackend, type ContenedorBackend } from '../../service/movimientosApi';
import { AlmacenApi } from '../../service/almacenApi';
import type { NuevoAlmacenFormData } from './Dialogs/NuevoAlmacenDialog';
import type { NuevoContenedorFormData } from './Dialogs/NuevoContenedorDialog';

/**
 * Almacenes y contenedores para los formularios de movimientos, más la
 * creación de uno nuevo desde el botón "+" de un select. Se cargan cada vez
 * que `activo` pasa a true (el dialog se abre).
 */
export function useUbicaciones(activo: boolean) {
    const notify = useNotify();
    const [almacenes, setAlmacenes] = useState<AlmacenBackend[]>([]);
    const [contenedores, setContenedores] = useState<ContenedorBackend[]>([]);
    const [cargando, setCargando] = useState(true);

    const recargar = useCallback(async () => {
        try {
            const [a, c] = await Promise.all([movimientosApi.listarAlmacenes(), movimientosApi.listarContenedores()]);
            setAlmacenes(a);
            setContenedores(c);
        } catch (error) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar los almacenes y contenedores'));
        } finally {
            setCargando(false);
        }
    }, [notify]);

    useEffect(() => {
        if (!activo) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al abrir el dialog
        void recargar();
    }, [activo, recargar]);

    /** Crea el almacén, recarga las listas y devuelve el creado. Lanza Error con el mensaje a mostrar. */
    const crearAlmacen = async ({ codigo, nombre }: NuevoAlmacenFormData): Promise<AlmacenBackend> => {
        try {
            const creado = await AlmacenApi.crear({
                codigoAlmacen: codigo,
                nombreAlmacen: nombre,
                cantidadContenedores: 0,
            });
            await recargar();
            notify.success(`Almacén "${nombre}" guardado correctamente`);
            return creado as AlmacenBackend;
        } catch (error) {
            throw new Error(getErrorMessage(error, 'No se pudo guardar el almacén'), { cause: error });
        }
    };

    /** Crea el contenedor en el almacén indicado (`almacenId` = _id), recarga y devuelve el creado. */
    const crearContenedor = async ({
        almacenId,
        codigo,
        nombre,
    }: NuevoContenedorFormData): Promise<ContenedorBackend> => {
        try {
            const creado = await AlmacenApi.crearContenedor({
                codigoContenedor: codigo,
                nombreContenedor: nombre,
                almacen: almacenId,
            });
            await recargar();
            notify.success(`Contenedor "${nombre}" guardado correctamente`);
            return creado as ContenedorBackend;
        } catch (error) {
            throw new Error(getErrorMessage(error, 'No se pudo guardar el contenedor'), { cause: error });
        }
    };

    return { almacenes, contenedores, cargando, recargar, crearAlmacen, crearContenedor };
}
