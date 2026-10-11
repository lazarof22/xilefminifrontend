// src/components/AlmacenesTab.tsx
import { useState, useEffect, useCallback } from 'react';
import {
    Card, CardContent, Typography, Box, Divider, Chip,
    Button, Alert
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { AlmacenApi } from '../../service/almacenApi';
import NuevoContenedorDialog, { type NuevoContenedorFormData } from './Dialogs/NuevoContenedorDialog';
import NuevoAlmacenDialog, { type NuevoAlmacenFormData } from './Dialogs/NuevoAlmacenDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── INTERFACES ───────────────────────────────────────────────
interface Almacen {
    id: string;
    mongoId?: string;
    nombre: string;
    contenedoresCount: number;
}

interface Contenedor {
    id: string;
    mongoId?: string;
    nombre: string;
    almacenId: string;
    almacenNombre: string;
    productosCount: number;
}

interface AlmacenesTabProps {
    // Opcional: datos externos
    almacenesExternos?: Almacen[];
    contenedoresExternos?: Contenedor[];
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────
export default function AlmacenesTab({ almacenesExternos, contenedoresExternos }: AlmacenesTabProps) {
    // Estados
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [contenedores, setContenedores] = useState<Contenedor[]>([]);

    // Dialog almacén
    const [dialogAlmacenOpen, setDialogAlmacenOpen] = useState(false);

    // Dialog contenedor
    const [dialogContenedorOpen, setDialogContenedorOpen] = useState(false);

    // Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar datos desde el backend (o usar los externos si vienen por props)
    const cargarDatos = useCallback(async () => {
        if (almacenesExternos && contenedoresExternos) {
            setAlmacenes(almacenesExternos);
            setContenedores(contenedoresExternos);
            return;
        }

        try {
            const [almacenesData, contenedoresData] = await Promise.all([
                AlmacenApi.listar(),
                AlmacenApi.listarContenedores(),
            ]);

            const adaptadosContenedores: Contenedor[] = contenedoresData.map(
                (item) => {
                    const almacenPopulado =
                        typeof item.almacen === 'object' ? item.almacen : null;

                    return {
                        id: item.codigoContenedor,
                        mongoId: item._id,
                        nombre: item.nombreContenedor,
                        almacenId: almacenPopulado?._id ?? String(item.almacen),
                        almacenNombre: almacenPopulado?.nombreAlmacen ?? '',
                        productosCount: item.productosCount ?? 0,
                    };
                },
            );

            const adaptadosAlmacenes: Almacen[] = almacenesData.map((item) => ({
                id: item.codigoAlmacen ?? item._id ?? '',
                mongoId: item._id,
                nombre: item.nombreAlmacen,
                contenedoresCount: adaptadosContenedores.filter(
                    (contenedor) => contenedor.almacenId === item._id,
                ).length,
            }));

            setContenedores(adaptadosContenedores);
            setAlmacenes(adaptadosAlmacenes);
        } catch (error) {
            console.error('Error cargando almacenes y contenedores:', error);
            setAlert({
                type: 'error',
                message: 'No se pudieron cargar los almacenes y contenedores',
            });
        }
    }, [almacenesExternos, contenedoresExternos]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // ─── AGREGAR ALMACÉN ────────────────────────────────────────
    const agregarAlmacen = async ({ codigo, nombre }: NuevoAlmacenFormData) => {
        try {
            const creado = await AlmacenApi.crear({
                codigoAlmacen: codigo,
                nombreAlmacen: nombre,
                cantidadContenedores: 0,
            });

            const nuevo: Almacen = {
                id: creado.codigoAlmacen,
                mongoId: creado._id,
                nombre: creado.nombreAlmacen,
                contenedoresCount: 0,
            };
            setAlmacenes((prev) => [...prev, nuevo]);

            setAlert({
                type: 'success',
                message: 'Almacén guardado correctamente en la base de datos',
            });
            setTimeout(() => setAlert(null), 3000);
        } catch (error: any) {
            console.error('Error creando almacén:', error);
            const msg = error?.response?.data?.message;
            throw new Error(
                msg
                    ? `Error: ${Array.isArray(msg) ? msg.join(', ') : msg}`
                    : 'No se pudo guardar el almacén',
                { cause: error },
            );
        }
    };

    // ─── AGREGAR CONTENEDOR ────────────────────────────────────
    const agregarContenedor = async ({ almacenId, codigo, nombre }: NuevoContenedorFormData) => {
        const alm = almacenes.find((a) => a.id === almacenId);

        if (!alm?.mongoId) {
            throw new Error('No se encontró el identificador del almacén en la base de datos');
        }

        try {
            // Crear el contenedor en MongoDB
            const creado = await AlmacenApi.crearContenedor({
                codigoContenedor: codigo,
                nombreContenedor: nombre,
                almacen: alm.mongoId,
            });

            // Adaptar el contenedor creado
            const nuevo: Contenedor = {
                id: creado.codigoContenedor,
                mongoId: creado._id,
                nombre: creado.nombreContenedor,
                almacenId: alm.mongoId,
                almacenNombre: alm.nombre,
                productosCount: creado.productosCount ?? 0,
            };
            setContenedores((prev) => [...prev, nuevo]);
            setAlmacenes((prev) =>
                prev.map((a) =>
                    a.mongoId === alm.mongoId
                        ? { ...a, contenedoresCount: a.contenedoresCount + 1 }
                        : a,
                ),
            );

            setAlert({
                type: 'success',
                message: '✅ Contenedor guardado correctamente en la base de datos',
            });
            setTimeout(() => setAlert(null), 3000);
        } catch (error: any) {
            console.error('Error creando contenedor:', error);
            const msg = error?.response?.data?.message;
            throw new Error(
                msg
                    ? `Error: ${Array.isArray(msg) ? msg.join(', ') : msg}`
                    : 'No se pudo guardar el contenedor',
                { cause: error },
            );
        }
    };

    // ─── COLUMNAS ───────────────────────────────────────────────
    const almacenColumns: Column<Almacen>[] = [
        { field: 'id', headerName: 'Código' },
        { field: 'nombre', headerName: 'Almacén' },
        { field: 'contenedoresCount', headerName: 'Contenedores', numeric: true, editable: false },
    ];

    const contenedorColumns: Column<Contenedor>[] = [
        { field: 'id', headerName: 'Código' },
        { field: 'nombre', headerName: 'Contenedor' },
        { field: 'almacenNombre', headerName: 'Almacén', editable: false },
        { field: 'productosCount', headerName: 'Productos', numeric: true, editable: false },
    ];

    // ─── RENDER ─────────────────────────────────────────────────
    return (
        <Box>
            {/* Alertas */}
            {alert && (
                <Alert
                    severity={alert.type}
                    sx={{
                        mb: 2,
                        borderRadius: 2,
                        mx: 1,
                        bgcolor: alert.type === 'success'
                            ? 'rgba(0,229,160,0.10)'
                            : 'rgba(255,82,82,0.10)',
                        color: alert.type === 'success' ? '#00e5a0' : '#ff8a80',
                        border: alert.type === 'success'
                            ? '1px solid rgba(0,229,160,0.18)'
                            : '1px solid rgba(255,82,82,0.18)',
                        '& .MuiAlert-icon': {
                            color: alert.type === 'success' ? '#00e5a0' : '#ff8a80'
                        }
                    }}
                    onClose={() => setAlert(null)}
                >
                    {alert.message}
                </Alert>
            )}

            {/* ═══════════════════════════════════════════════════
                CARD SUPERIOR: ALMACENES
            ═══════════════════════════════════════════════════ */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.04)",
                    bgcolor: "#151a19",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    overflow: "hidden",
                    m: 1,
                    mb: 2
                }}
            >
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ color: '#00e5a0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WarehouseIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Almacenes
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                            <Chip
                                label={`${almacenes.length} registrados`}
                                color="primary"
                                size="medium"
                                sx={{ p: 2 }}
                            />
                            {/* Agregar Almacén */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => setDialogAlmacenOpen(true)}
                                    sx={{
                                        textTransform: 'none',
                                        background: "linear-gradient(135deg, rgba(196, 45, 226, 0.9), rgba(10, 83, 218, 0.9))",
                                        color: "#fff",
                                        boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                        borderRadius: 1,
                                        px: 2,
                                        py: 0.8,
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        "&:hover": {
                                            background: "linear-gradient(135deg, rgba(196, 45, 226, 1), rgba(10, 83, 218, 1))",
                                            boxShadow: "0 6px 16px rgba(120, 40, 200, 0.5)"
                                        }
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 18, mr: 0.5 }} />
                                    Nuevo Almacén
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Tabla de Almacenes */}
                    <CustomDataGridR<Almacen>
                        rows={almacenes}
                        columns={almacenColumns}
                        getRowId={(row) => row.id}
                        title="Lista de Almacenes"
                        editConfig={{
                            baseUrl: `${API_URL}/almacen`,
                            getId: (row) => row.mongoId ?? row.id,
                            fieldMap: { id: 'codigoAlmacen', nombre: 'nombreAlmacen' },
                            onSuccess: () => {
                                cargarDatos();
                                setAlert({ type: 'success', message: 'Almacén actualizado' });
                                setTimeout(() => setAlert(null), 3000);
                            },
                            onError: (error) => {
                                setAlert({ type: 'error', message: error.message });
                                setTimeout(() => setAlert(null), 4000);
                            },
                        }}
                        deleteConfig={{
                            baseUrl: `${API_URL}/almacen`,
                            getId: (row) => row.mongoId ?? row.id,
                            onSuccess: () => {
                                cargarDatos();
                                setAlert({ type: 'success', message: 'Almacén eliminado' });
                                setTimeout(() => setAlert(null), 3000);
                            }
                        }}
                        getRowAvatar={(row) => row.nombre.charAt(0).toUpperCase()}
                    />
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                CARD INFERIOR: CONTENEDORES
                ═══════════════════════════════════════════════════ */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: "1px solid rgba(255,255,255,0.04)",
                    bgcolor: "#151a19",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    overflow: "hidden",
                    m: 1,
                    mt: 2
                }}
            >
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ color: '#00e5a0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Inventory2Icon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Contenedores
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                            <Chip
                                label={`${contenedores.length} registrados`}
                                color="primary"
                                size="medium"
                                sx={{ p: 2 }}
                            />
                            {/* Agregar Contenedor */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={() => setDialogContenedorOpen(true)}
                                    sx={{
                                        textTransform: 'none',
                                        background: "linear-gradient(135deg, rgba(196, 45, 226, 0.9), rgba(10, 83, 218, 0.9))",
                                        color: "#fff",
                                        boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                        borderRadius: 1,
                                        px: 2,
                                        py: 0.8,
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        "&:hover": {
                                            background: "linear-gradient(135deg, rgba(196, 45, 226, 1), rgba(10, 83, 218, 1))",
                                            boxShadow: "0 6px 16px rgba(120, 40, 200, 0.5)"
                                        }
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 18, mr: 0.5 }} />
                                    Nuevo Contenedor
                                </Button>
                            </Box>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Tabla de Contenedores */}
                    <CustomDataGridR<Contenedor>
                        rows={contenedores}
                        columns={contenedorColumns}
                        getRowId={(row) => row.id}
                        title="Lista de Contenedores"
                        editConfig={{
                            baseUrl: `${API_URL}/contenedor`,
                            getId: (row) => row.mongoId ?? row.id,
                            fieldMap: { id: 'codigoContenedor', nombre: 'nombreContenedor' },
                            onSuccess: () => {
                                cargarDatos();
                                setAlert({ type: 'success', message: 'Contenedor actualizado' });
                                setTimeout(() => setAlert(null), 3000);
                            },
                            onError: (error) => {
                                setAlert({ type: 'error', message: error.message });
                                setTimeout(() => setAlert(null), 4000);
                            },
                        }}
                        deleteConfig={{
                            baseUrl: `${API_URL}/contenedor`,
                            getId: (row) => row.mongoId ?? row.id,
                            onSuccess: () => {
                                cargarDatos();
                                setAlert({ type: 'success', message: 'Contenedor eliminado' });
                                setTimeout(() => setAlert(null), 3000);
                            }
                        }}
                        getRowAvatar={(row) => row.nombre.charAt(0).toUpperCase()}
                    />
                </CardContent>
            </Card>

            <NuevoAlmacenDialog
                open={dialogAlmacenOpen}
                onClose={() => setDialogAlmacenOpen(false)}
                onAgregar={agregarAlmacen}
            />

            <NuevoContenedorDialog
                open={dialogContenedorOpen}
                onClose={() => setDialogContenedorOpen(false)}
                almacenes={almacenes}
                onAgregar={agregarContenedor}
            />
        </Box>
    );
}