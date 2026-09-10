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
import DeleteIcon from "@mui/icons-material/Delete";
import CustomDataGridR, { type Column } from '../CustomDataGridR';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── INTERFACES ───────────────────────────────────────────────
interface Almacen {
    id: string;
    nombre: string;
    contenedoresCount: number;
}

interface Contenedor {
    id: string;
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
    const [contenedorCounter, setContenedorCounter] = useState(1);

    // Formulario almacén
    const [nuevoAlmacen, setNuevoAlmacen] = useState('');

    // Formulario contenedor
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');
    const [nuevoContenedor, setNuevoContenedor] = useState('');

    // Alert
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Cargar datos
    useEffect(() => {
        if (almacenesExternos) setAlmacenes(almacenesExternos);
        if (contenedoresExternos) setContenedores(contenedoresExternos);

        const saved = localStorage.getItem('almacenes_data');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setAlmacenes(parsed.almacenes || []);
                setContenedores(parsed.contenedores || []);
                setAlmacenCounter(parsed.almacenCounter || 1);
                setContenedorCounter(parsed.contenedorCounter || 1);
            } catch (e) {
                console.error('Error cargando almacenes:', e);
            }
        }
    }, [almacenesExternos, contenedoresExternos]);

    // Guardar datos
    const guardarDatos = (alm: Almacen[], cont: Contenedor[], aCounter: number, cCounter: number) => {
        localStorage.setItem('almacenes_data', JSON.stringify({
            almacenes: alm,
            contenedores: cont,
            almacenCounter: aCounter,
            contenedorCounter: cCounter
        }));
    };

    // ─── AGREGAR ALMACÉN ────────────────────────────────────────
    const agregarAlmacen = () => {
        if (!nuevoAlmacen.trim()) {
            setAlert({ type: 'error', message: 'Ingrese un nombre para el almacén' });
            return;
        }

        const nuevo: Almacen = {
            id: `ALM-${String(almacenCounter).padStart(4, '0')}`,
            nombre: nuevoAlmacen.trim(),
            contenedoresCount: 0
        };

        const nuevosAlmacenes = [...almacenes, nuevo];
        const newCounter = almacenCounter + 1;

        setAlmacenes(nuevosAlmacenes);
        setAlmacenCounter(newCounter);
        guardarDatos(nuevosAlmacenes, contenedores, newCounter, contenedorCounter);

        setNuevoAlmacen('');
        setAlert({ type: 'success', message: '✅ Almacén agregado correctamente' });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── ELIMINAR ALMACÉN ───────────────────────────────────────
    const eliminarAlmacen = (id: string) => {
        if (!confirm('¿Eliminar almacén? Los contenedores asociados también se eliminarán.')) return;

        const contenedoresAsociados = contenedores.filter(c => c.almacenId === id);
        const nuevosContenedores = contenedores.filter(c => c.almacenId !== id);
        const nuevosAlmacenes = almacenes.filter(a => a.id !== id);

        setAlmacenes(nuevosAlmacenes);
        setContenedores(nuevosContenedores);
        guardarDatos(nuevosAlmacenes, nuevosContenedores, almacenCounter, contenedorCounter);

        setAlert({ type: 'success', message: `Almacén eliminado. ${contenedoresAsociados.length} contenedores removidos.` });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── AGREGAR CONTENEDOR ─────────────────────────────────────
    const agregarContenedor = () => {
        if (!almacenSeleccionado || !nuevoContenedor.trim()) {
            setAlert({ type: 'error', message: 'Seleccione un almacén e ingrese un nombre' });
            return;
        }

        const alm = almacenes.find(a => a.id === almacenSeleccionado);
        if (!alm) return;

        const nuevo: Contenedor = {
            id: `CONT-${String(contenedorCounter).padStart(4, '0')}`,
            nombre: nuevoContenedor.trim(),
            almacenId: almacenSeleccionado,
            almacenNombre: alm.nombre,
            productosCount: 0
        };

        const nuevosContenedores = [...contenedores, nuevo];
        const newCounter = contenedorCounter + 1;

        // Actualizar contador de contenedores del almacén
        const nuevosAlmacenes = almacenes.map(a =>
            a.id === almacenSeleccionado
                ? { ...a, contenedoresCount: a.contenedoresCount + 1 }
                : a
        );

        setContenedores(nuevosContenedores);
        setAlmacenes(nuevosAlmacenes);
        setContenedorCounter(newCounter);
        guardarDatos(nuevosAlmacenes, nuevosContenedores, almacenCounter, newCounter);

        setNuevoContenedor('');
        setAlert({ type: 'success', message: '✅ Contenedor agregado correctamente' });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── ELIMINAR CONTENEDOR ────────────────────────────────────
    const eliminarContenedor = (id: string) => {
        if (!confirm('¿Eliminar contenedor?')) return;

        const cont = contenedores.find(c => c.id === id);
        const nuevosContenedores = contenedores.filter(c => c.id !== id);

        // Actualizar contador del almacén
        const nuevosAlmacenes = cont
            ? almacenes.map(a => a.id === cont.almacenId ? { ...a, contenedoresCount: Math.max(0, a.contenedoresCount - 1) } : a)
            : almacenes;

        setContenedores(nuevosContenedores);
        setAlmacenes(nuevosAlmacenes);
        guardarDatos(nuevosAlmacenes, nuevosContenedores, almacenCounter, contenedorCounter);

        setAlert({ type: 'success', message: 'Contenedor eliminado' });
        setTimeout(() => setAlert(null), 3000);
    };

    // ─── COLUMNAS ───────────────────────────────────────────────
    const almacenColumns: Column<Almacen>[] = [
        { field: 'id', headerName: 'Código' },
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
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Nombre del almacén"
                                    value={nuevoAlmacen}
                                    onChange={(e) => setNuevoAlmacen(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && agregarAlmacen()}
                                    sx={{
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
                                    onClick={agregarAlmacen}
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

                    {/* Tabla de Almacenes */}
                    <CustomDataGridR<Almacen>
                        rows={almacenes}
                        columns={almacenColumns}
                        getRowId={(row) => row.id}
                        title="Lista de Almacenes"
                        deleteConfig={{
                            baseUrl: `${API_URL}/almacenes`,
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
                        deleteConfig={{
                            baseUrl: `${API_URL}/contenedores`,
                            onSuccess: () => {
                                setAlert({ type: 'success', message: 'Contenedor eliminado' });
                                setTimeout(() => setAlert(null), 3000);
                            }
                        }}
                        getRowAvatar={(row) => row.nombre.charAt(0).toUpperCase()}
                    />
                </CardContent>
            </Card>
        </Box>
    );
}