// src/pages/clientesProveedores/Proveedores.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CustomDataGrid, { type Column } from '../../components/CustomDataGridR';
import AñadirProveedorDialog from '../../components/proveedores/AñadirProveedorDialog';
import { useNotify } from '../../components/notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { proveedorApi, type ProveedorBackend } from '../../service/proveedorApi';

interface ProveedorRow {
    id: string;
    codigo: string;
    nombre: string;
    cuentaBancaria: string;
    direccion: string;
    telefono: number;
}

const aFila = (p: ProveedorBackend): ProveedorRow => ({
    id: p._id,
    codigo: p.codigo,
    nombre: p.nombre,
    cuentaBancaria: p.cuentaBancaria,
    direccion: p.direccion,
    telefono: p.telefono,
});

const columns: Column<ProveedorRow>[] = [
    { field: 'codigo', headerName: 'Código' },
    { field: 'nombre', headerName: 'Nombre' },
    { field: 'cuentaBancaria', headerName: 'Cuenta bancaria' },
    { field: 'direccion', headerName: 'Dirección' },
    // Texto, no numérico: así el teléfono no se formatea ni se alinea como una cantidad.
    { field: 'telefono', headerName: 'Teléfono', type: 'text' },
];

export default function ProveedoresPage(): React.JSX.Element {
    const notify = useNotify();
    const [proveedores, setProveedores] = useState<ProveedorBackend[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const cargarProveedores = useCallback(async (): Promise<void> => {
        try {
            setProveedores(await proveedorApi.getAll());
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar los proveedores'));
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void cargarProveedores();
    }, [cargarProveedores]);

    const rows = useMemo(() => proveedores.map(aFila), [proveedores]);

    return (
        <Box>
            <Box
                sx={{
                    width: '100%',
                    height: 70,
                    background: 'linear-gradient(135deg, #131817 0%, #043625 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ color: '#f0f0f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Proveedores
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de gestión de proveedores
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<LocalShippingIcon />}
                    onClick={() => setDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                    }}
                >
                    Agregar proveedor
                </Button>
            </Box>

            <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Box sx={{ mt: 2 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                                    <CircularProgress />
                                </Box>
                            ) : (
                                <CustomDataGrid<ProveedorRow>
                                    title={`Proveedores registrados (${rows.length})`}
                                    rows={rows}
                                    getRowId={(row) => row.id}
                                    columns={columns}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <AñadirProveedorDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onGuardado={() => void cargarProveedores()}
            />
        </Box>
    );
}
