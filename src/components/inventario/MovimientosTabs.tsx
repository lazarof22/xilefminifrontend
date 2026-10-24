// src/components/MovimientosTabs.tsx
// Historial de compras y transferencias. Los formularios para registrarlas
// viven en dialogs (Dialogs/RegistrarCompraDialog y RegistrarTransferenciaDialog)
// que se abren desde la cabecera de Inventario.
import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import {
    movimientosApi,
    type ProductoBackend,
    type AlmacenBackend,
    type ContenedorBackend,
    type RegistroCompraListadoBackend,
    type TransferenciaListadoBackend,
} from '../../service/movimientosApi';

// ─── Tablas de movimientos ───────────────────────────────────
// El grid ordena por la PRIMERA columna en ascendente. El backend ya envía
// los movimientos del más reciente al más antiguo, así que la primera
// columna es la posición (1 = más reciente): al abrir se ve lo último primero.
interface CompraRow {
    id: string;
    posicion: number;
    fecha: string;
    producto: string;
    almacen: string;
    contenedor: string;
    cantidad: number;
    costoUnitario: number;
    total: number;
}

interface TransferenciaRow {
    id: string;
    posicion: number;
    fecha: string;
    producto: string;
    almacenOrigen: string;
    contenedorOrigen: string;
    almacenDestino: string;
    contenedorDestino: string;
    cantidad: number;
}

const compraColumns: Column<CompraRow>[] = [
    { field: 'posicion', headerName: '#', numeric: true },
    { field: 'fecha', headerName: 'Fecha' },
    { field: 'producto', headerName: 'Producto' },
    { field: 'almacen', headerName: 'Almacén' },
    { field: 'contenedor', headerName: 'Contenedor' },
    { field: 'cantidad', headerName: 'Cantidad', numeric: true },
    { field: 'costoUnitario', headerName: 'Costo Unitario', numeric: true },
    { field: 'total', headerName: 'Total', numeric: true },
];

const transferenciaColumns: Column<TransferenciaRow>[] = [
    { field: 'posicion', headerName: '#', numeric: true },
    { field: 'fecha', headerName: 'Fecha' },
    { field: 'producto', headerName: 'Producto' },
    { field: 'almacenOrigen', headerName: 'Almacén Origen' },
    { field: 'contenedorOrigen', headerName: 'Contenedor Origen' },
    { field: 'almacenDestino', headerName: 'Almacén Destino' },
    { field: 'contenedorDestino', headerName: 'Contenedor Destino' },
    { field: 'cantidad', headerName: 'Cantidad', numeric: true },
];

/** "2026-10-08T12:00:00.000Z" → "2026-10-08" (la fecha que se eligió en el formulario). */
const formatFecha = (fecha?: string): string => (fecha ? fecha.slice(0, 10) : '—');

export interface MovimientosTabsProps {
    /** Al cambiar este valor se vuelve a cargar el historial (tras registrar una compra/transferencia). */
    refreshKey?: number;
}

export default function MovimientosTabs({ refreshKey = 0 }: MovimientosTabsProps): React.JSX.Element {
    const [productos, setProductos] = useState<ProductoBackend[]>([]);
    const [almacenes, setAlmacenes] = useState<AlmacenBackend[]>([]);
    const [contenedores, setContenedores] = useState<ContenedorBackend[]>([]);
    const [compras, setCompras] = useState<RegistroCompraListadoBackend[]>([]);
    const [transferencias, setTransferencias] = useState<TransferenciaListadoBackend[]>([]);
    const notify = useNotify();

    // Cada carga es independiente: si una falla, las demás se muestran igual.
    const cargar = useCallback(async () => {
        const avisar = (msg: string) => (error: unknown) => {
            console.error(msg, error);
            notify.error(getErrorMessage(error, msg));
        };
        await Promise.all([
            movimientosApi.listarProductos().then(setProductos).catch(avisar('No se pudieron cargar los productos')),
            movimientosApi.listarAlmacenes().then(setAlmacenes).catch(avisar('No se pudieron cargar los almacenes')),
            movimientosApi
                .listarContenedores()
                .then(setContenedores)
                .catch(avisar('No se pudieron cargar los contenedores')),
            movimientosApi
                .listarRegistroCompras()
                .then(setCompras)
                .catch(avisar('No se pudo cargar el historial de compras')),
            movimientosApi
                .listarTransferencias()
                .then(setTransferencias)
                .catch(avisar('No se pudo cargar el historial de transferencias')),
        ]);
    }, [notify]);

    useEffect(() => {
        void cargar();
    }, [cargar, refreshKey]);

    // ─── Filas de las tablas ─────────────────────────────────────
    // Si el backend no pudo poblar una referencia (llegó el ID, o el
    // documento ya no existe), se busca el nombre en las listas cargadas.
    const nombreProducto = (ref: RegistroCompraListadoBackend['producto']): string => {
        const p = typeof ref === 'string' ? productos.find((x) => x._id === ref) : ref;
        return p ? `${p.nombre_producto} (${p.codigo_producto})` : '—';
    };

    const nombreAlmacen = (ref: RegistroCompraListadoBackend['almacen']): string => {
        const a = typeof ref === 'string' ? almacenes.find((x) => x._id === ref) : ref;
        return a?.nombreAlmacen ?? '—';
    };

    const nombreContenedor = (ref: RegistroCompraListadoBackend['contenedor']): string => {
        const c = typeof ref === 'string' ? contenedores.find((x) => x._id === ref) : ref;
        return c?.nombreContenedor ?? '—';
    };

    const comprasRows: CompraRow[] = compras.map((c, index) => ({
        id: c._id,
        posicion: index + 1,
        fecha: formatFecha(c.fecha ?? c.createdAt),
        producto: nombreProducto(c.producto),
        almacen: nombreAlmacen(c.almacen),
        contenedor: nombreContenedor(c.contenedor),
        cantidad: c.cantidad,
        costoUnitario: c.costo_unitario,
        total: c.total,
    }));

    const transferenciasRows: TransferenciaRow[] = transferencias.map((t, index) => ({
        id: t._id,
        posicion: index + 1,
        fecha: formatFecha(t.fecha ?? t.createdAt),
        producto: nombreProducto(t.producto),
        almacenOrigen: nombreAlmacen(t.almacen_origen),
        contenedorOrigen: nombreContenedor(t.contenedor_origen),
        almacenDestino: nombreAlmacen(t.almacen_destino),
        contenedorDestino: nombreContenedor(t.contenedor_destino),
        cantidad: t.cantidad,
    }));

    return (
        <Box sx={{ p: 1, display: 'grid', gap: 2 }}>
            <Box sx={{ minWidth: 0 }}>
                <CustomDataGridR<CompraRow>
                    title="Historial de Compras"
                    rows={comprasRows}
                    columns={compraColumns}
                    getRowId={(row) => row.id}
                />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <CustomDataGridR<TransferenciaRow>
                    title="Historial de Transferencias"
                    rows={transferenciasRows}
                    columns={transferenciaColumns}
                    getRowId={(row) => row.id}
                />
            </Box>
        </Box>
    );
}
