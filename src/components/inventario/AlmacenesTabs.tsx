// src/components/AlmacenesTab.tsx
import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Divider, Chip,
    TextField, Button, Alert,
    FormControl, Select, MenuItem
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AddIcon from '@mui/icons-material/Add';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { AlmacenApi } from '../../service/almacenApi';

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
    const [almacenCounter, setAlmacenCounter] = useState(1);

    // Formulario almacén
    const [codigoAlmacen, setCodigoAlmacen] = useState('');
    const [nuevoAlmacen, setNuevoAlmacen] = useState('');

    // Formulario contenedor
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');
    const [nuevoContenedor, setNuevoContenedor] = useState('');
    const [codigoNuevoContenedor, setCodigoNuevoContenedor] = useState('');

    // Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar datos desde el backend
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [almacenesData, contenedoresData] =
                    await Promise.all([
                        AlmacenApi.listar(),
                        AlmacenApi.listarContenedores(),
                    ]);
                const adaptadosContenedores = contenedoresData.map(
                    (item: any) => ({
                        id: item.codigoContenedor,
                        mongoId: item._id,
                        nombre: item.nombreContenedor,

                        almacenId:
                            item.almacen?._id ??
                            item.almacen,

                        almacenNombre:
                            item.almacen?.nombreAlmacen ??
                            item.almacenNombre ??
                            '',

                        productosCount:
                            item.productosCount ?? 0,
                    }),
                );
                setContenedores(adaptadosContenedores);
                const adaptadosAlmacenes: Almacen[] =
                    almacenesData.map((item: any) => ({
                        id: item.codigoAlmacen,
                        mongoId: item._id,
                        nombre: item.nombreAlmacen,

                        contenedoresCount:
                            adaptadosContenedores.filter(
                                (contenedor) =>
                                    contenedor.almacenId ===
                                    item._id,
                            ).length,
                    }));

                setAlmacenes(adaptadosAlmacenes);

            } catch (error) {
                console.error(
                    'Error cargando almacenes y contenedores:',
                    error,
                );

                setAlert({
                    type: 'error',
                    message:
                        'No se pudieron cargar los almacenes y contenedores',
                });
            }
        };
    }, [almacenesExternos, contenedoresExternos]);

    // ─── AGREGAR ALMACÉN ────────────────────────────────────────
    const agregarAlmacen = async () => {
        if (!codigoAlmacen.trim()) {
            setAlert({ type: 'error', message: 'Ingrese un código para el almacén', });
            return;
        }
        if (!nuevoAlmacen.trim()) {
            setAlert({ type: 'error', message: 'Ingrese un nombre para el almacén', });
            return;
        }
        if (codigoAlmacen.trim().length > 20) {
            setAlert({
                type: 'error', message: 'El código no puede tener más de 20 caracteres',
            });
            return;
        }
        try {
            const creado =
                await AlmacenApi.crear({
                    codigoAlmacen: codigoAlmacen.trim(),
                    nombreAlmacen: nuevoAlmacen.trim(),
                    cantidadContenedores: 0,
                });

            const nuevo: Almacen = {
                id: creado.codigoAlmacen,
                mongoId: creado._id,
                nombre: creado.nombreAlmacen,
                contenedoresCount: 0,
            };
            setAlmacenes((prev) => [
                ...prev,
                nuevo,
            ]);
            setCodigoAlmacen('');
            setNuevoAlmacen('');

            setAlert({
                type: 'success',
                message:
                    'Almacén guardado correctamente en la base de datos',
            });
            setTimeout(
                () => setAlert(null),
                3000,
            );
        } catch (error: any) {
            console.error(
                'Error creando almacén:',
                error,
            );
            const msg =
                error?.response?.data?.message;
            setAlert({
                type: 'error',
                message: msg
                    ? `Error: ${Array.isArray(msg)
                        ? msg.join(', ')
                        : msg
                    }`
                    : 'No se pudo guardar el almacén',
            });
        }
    };

    // ─── ELIMINAR ALMACÉN ───────────────────────────────────────
    const eliminarAlmacen = (id: string) => {
        if (!confirm('¿Eliminar almacén? Los contenedores asociados también se eliminarán.')) return;

        const contenedoresAsociados = contenedores.filter(c => c.almacenId === id);
        const nuevosContenedores = contenedores.filter(c => c.almacenId !== id);
        const nuevosAlmacenes = almacenes.filter(a => a.id !== id);

        setAlmacenes(nuevosAlmacenes);
        setContenedores(nuevosContenedores);

        setAlert({ type: 'success', message: `Almacén eliminado. ${contenedoresAsociados.length} contenedores removidos.` });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── AGREGAR CONTENEDOR ────────────────────────────────────
    const agregarContenedor = async () => {
        if (
            !almacenSeleccionado ||
            !codigoNuevoContenedor.trim() ||
            !nuevoContenedor.trim()
        ) {
            setAlert({
                type: 'error',
                message:
                    'Seleccione un almacén e ingrese código y nombre del contenedor',
            });
            return;
        }

        const alm = almacenes.find(
            (a) => a.id === almacenSeleccionado,
        );

        if (!alm?.mongoId) {
            setAlert({
                type: 'error',
                message:
                    'No se encontró el identificador del almacén en la base de datos',
            });
            return;
        }

        try {
            // Crear el contenedor en MongoDB
            const creado =
                await AlmacenApi.crearContenedor({
                    codigoContenedor:
                        codigoNuevoContenedor.trim(),

                    nombreContenedor:
                        nuevoContenedor.trim(),

                    almacen: alm.mongoId,
                });

            // Adaptar el contenedor creado
            const nuevo: Contenedor = {
                id: creado.codigoContenedor,
                mongoId: creado._id,
                nombre: creado.nombreContenedor,
                almacenId: alm.mongoId,
                almacenNombre: alm.nombre,
                productosCount:
                    creado.productosCount ?? 0,
            };
            setContenedores((prev) => [
                ...prev,
                nuevo,
            ]);
            setAlmacenes((prev) =>
                prev.map((a) =>
                    a.mongoId === alm.mongoId
                        ? {
                            ...a,
                            contenedoresCount:
                                a.contenedoresCount + 1,
                        }
                        : a,
                ),
            );

            // Limpiar formulario
            setCodigoNuevoContenedor('');
            setNuevoContenedor('');

            setAlert({
                type: 'success',
                message:
                    '✅ Contenedor guardado correctamente en la base de datos',
            });

            setTimeout(
                () => setAlert(null),
                3000,
            );
        } catch (error: any) {
            console.error(
                'Error creando contenedor:',
                error,
            );

            const msg =
                error?.response?.data?.message;

            setAlert({
                type: 'error',
                message: msg
                    ? `Error: ${Array.isArray(msg)
                        ? msg.join(', ')
                        : msg
                    }`
                    : 'No se pudo guardar el contenedor',
            });
        }
    };
    // ─── ELIMINAR CONTENEDOR ────────────────────────────────────

    const eliminarContenedor = async (
        id: string,
    ) => {
        if (!confirm('¿Eliminar contenedor?')) {
            return;
        }

        const cont = contenedores.find(
            (c) => c.id === id,
        );

        if (!cont?.mongoId) {
            setAlert({
                type: 'error',
                message:
                    'No se encontró el identificador del contenedor',
            });
            return;
        }

        try {
            // Eliminar el contenedor de MongoDB
            await AlmacenApi.eliminarContenedor(
                cont.mongoId,
            );

            // Quitar el contenedor de la lista
            setContenedores((prev) =>
                prev.filter(
                    (c) => c.id !== id,
                ),
            );

            // Actualizar la cantidad del almacén
            // al que pertenecía el contenedor
            if (cont.almacenId) {
                setAlmacenes((prev) =>
                    prev.map((a) =>
                        a.mongoId === cont.almacenId
                            ? {
                                ...a,
                                contenedoresCount:
                                    Math.max(
                                        0,
                                        a.contenedoresCount -
                                        1,
                                    ),
                            }
                            : a,
                    ),
                );
            }

            setAlert({
                type: 'success',
                message:
                    'Contenedor eliminado',
            });

            setTimeout(
                () => setAlert(null),
                3000,
            );
        } catch (error: any) {
            console.error(
                'Error eliminando contenedor:',
                error,
            );

            setAlert({
                type: 'error',
                message:
                    'No se pudo eliminar el contenedor',
            });
        }
    };



    // ─── COLUMNAS ───────────────────────────────────────────────
    const almacenColumns: Column<Almacen>[] = [
        { field: 'codigoAlmacen', headerName: 'Código' },
        { field: 'nombre', headerName: 'Almacén' },
        { field: 'contenedoresCount', headerName: 'Contenedores', numeric: true },
    ];

    const contenedorColumns: Column<Contenedor>[] = [
        { field: 'id', headerName: 'Código' },
        { field: 'nombre', headerName: 'Contenedor' },
        { field: 'almacenNombre', headerName: 'Almacén' },
        { field: 'productosCount', headerName: 'Productos', numeric: true },
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
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6"
                            sx={{
                                color: '#00e5a0',

                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                            <WarehouseIcon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Almacenes
                        </Typography>
                        <Chip
                            label={`${almacenes.length} registrados`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(0,229,160,0.10)',
                                color: '#00e5a0',
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Agregar Almacén */}
                    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,0.06)', bgcolor: '#151a19', mb: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                }}
                            >
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Código del almacén"
                                    placeholder="Ej: ALM-0001"
                                    value={codigoAlmacen}
                                    onChange={(e) =>setCodigoAlmacen(e.target.value)}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 20,
                                        },
                                    }}
                                    sx={{
                                        flex: 1,

                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            bgcolor:
                                                'rgba(255,255,255,0.03)',

                                            '& fieldset': {
                                                borderColor:
                                                    'rgba(255,255,255,0.06)',
                                            },

                                            '&:hover fieldset': {
                                                borderColor:
                                                    'rgba(0,229,160,0.35)',
                                            },

                                            '&.Mui-focused fieldset': {
                                                borderColor: '#00e5a0',
                                            },
                                        },
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Nombre del almacén"
                                    placeholder="Ej: Almacén Principal"
                                    value={nuevoAlmacen}
                                    onChange={(e) =>
                                        setNuevoAlmacen(
                                            e.target.value,
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            agregarAlmacen();
                                        }
                                    }}
                                    sx={{
                                        flex: 2,

                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            bgcolor:
                                                'rgba(255,255,255,0.03)',

                                            '& fieldset': {
                                                borderColor:
                                                    'rgba(255,255,255,0.06)',
                                            },

                                            '&:hover fieldset': {
                                                borderColor:
                                                    'rgba(0,229,160,0.35)',
                                            },

                                            '&.Mui-focused fieldset': {
                                                borderColor: '#00e5a0',
                                            },
                                        },
                                    }}
                                />

                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={agregarAlmacen}
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #00e5a0, #00b87d)',
                                        color: '#fff',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        borderRadius: 1,
                                        px: 3,
                                        whiteSpace: 'nowrap',
                                        boxShadow:
                                            '0 4px 12px rgba(0,229,160,0.20)',
                                    }}
                                >
                                    <AddIcon
                                        sx={{
                                            fontSize: 18,
                                            mr: 0.5,
                                        }}
                                    />

                                    Agregar
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tabla de Almacenes */}
                    <CustomDataGridR<Almacen>
                        rows={almacenes}
                        columns={almacenColumns}
                        getRowId={(row) => row.id}
                        title="Lista de Almacenes"
                        deleteConfig={{
                            baseUrl: `${API_URL}/almacen`,
                            onSuccess: () => {
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
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6"
                            sx={{
                                color: '#00e5a0',

                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                            <Inventory2Icon sx={{ color: '#00e5a0', width: 24, height: 24 }} />
                            Contenedores
                        </Typography>
                        <Chip
                            label={`${contenedores.length} registrados`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(0,229,160,0.10)',
                                color: '#00e5a0',
                                fontWeight: 600,
                                borderRadius: 2
                            }}
                        />
                    </Box>

                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.06)' }} />

                    {/* Agregar Contenedor */}
                    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'rgba(255,255,255,0.06)', bgcolor: '#151a19', mb: 2 }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <FormControl
                                    size="small"
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            color: '#e8f5f0',
                                            '& fieldset': {
                                                borderColor: 'rgba(255,255,255,0.08)'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: 'rgba(0,229,160,0.35)'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#00e5a0'
                                            }
                                        }
                                    }}
                                >
                                    <Select
                                        value={almacenSeleccionado}
                                        onChange={(e) => setAlmacenSeleccionado(e.target.value)}
                                        displayEmpty
                                        MenuProps={{
                                            slotProps: {
                                                paper: {
                                                    sx: {
                                                        bgcolor: '#151a19',
                                                        color: '#e8f5f0',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        '& .MuiMenuItem-root': {
                                                            '&:hover': {
                                                                bgcolor: 'rgba(0,229,160,0.08)'
                                                            },
                                                            '&.Mui-selected': {
                                                                bgcolor: 'rgba(0,229,160,0.12)',
                                                                '&:hover': {
                                                                    bgcolor: 'rgba(0,229,160,0.16)'
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                        sx={{
                                            '& .MuiSelect-select': {
                                                py: 1,
                                                color: almacenSeleccionado ? '#e8f5f0' : 'rgba(232,245,240,0.55)'
                                            },
                                            '& .MuiSvgIcon-root': {
                                                color: '#00e5a0'
                                            }
                                        }}
                                    >
                                        <MenuItem value="" disabled>
                                            -- Seleccione Almacén --
                                        </MenuItem>
                                        {almacenes.map(a => (
                                            <MenuItem key={a.id} value={a.id}>
                                                {a.nombre}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    size="small"
                                    placeholder="Código del contenedor"
                                    value={codigoNuevoContenedor}
                                    onChange={(e) => setCodigoNuevoContenedor(e.target.value)}
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
                                            '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
                                            '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
                                        }
                                    }}
                                />
                                <TextField
                                    size="small"
                                    placeholder="Nombre del contenedor"
                                    value={nuevoContenedor}
                                    onChange={(e) => setNuevoContenedor(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && agregarContenedor()}
                                    sx={{
                                        flex: 2,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
                                            '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
                                            '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={agregarContenedor}
                                    sx={{
                                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                                        color: "#fff",
                                        textTransform: "none",
                                        fontWeight: 600,
                                        borderRadius: 1,
                                        px: 3,
                                        whiteSpace: 'nowrap',
                                        boxShadow: "0 4px 12px rgba(0,229,160,0.20)",
                                    }}
                                >
                                    <AddIcon sx={{ fontSize: 18, mr: 0.5 }} />
                                    Agregar
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Tabla de Contenedores */}
                    <CustomDataGridR<Contenedor>
                        rows={contenedores}
                        columns={contenedorColumns}
                        getRowId={(row) => row.id}
                        title="Lista de Contenedores"
                        getRowAvatar={(row) => row.nombre.charAt(0).toUpperCase()}
                    />
                </CardContent>
            </Card>
        </Box>
    );
}