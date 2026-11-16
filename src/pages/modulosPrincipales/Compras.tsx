// src/pages/modulosPrincipales/Compras.tsx
// Compras = Informe de Recepción SC-2-04 (documento de diseño §6.2): cabecera normativa,
// documento de origen y líneas de productos; el saldo se actualiza al registrar.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Tooltip, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CustomDataGrid, { type Column } from '../../components/CustomDataGridR';
import { InformeRecepcionDialog } from '../../components/inventario/Dialogs/RegistrarCompraDialog';
import { useNotify } from '../../components/notificaciones/useNotify';
import { useAuth } from '../../context/authContext';
import { getErrorMessage } from '../../utils/errorMessage';
import { puedeRegistrarRecepcion } from '../../utils/permisos';
import { recepcionApi, type Recepcion } from '../../service/recepcionApi';
import { proveedorApi, type ProveedorBackend } from '../../service/proveedorApi';

interface RecepcionRow {
    id: string;
    numero: string;
    fecha: string;
    proveedor: string;
    documentoOrigen: string;
    lineas: number;
    total: number;
    estado: string;
    responsable: string;
}

const columns: Column<RecepcionRow>[] = [
    { field: 'numero', headerName: 'N.º' },
    { field: 'fecha', headerName: 'Fecha', type: 'date' },
    { field: 'proveedor', headerName: 'Proveedor' },
    { field: 'documentoOrigen', headerName: 'Documento de origen' },
    { field: 'lineas', headerName: 'Líneas', numeric: true },
    { field: 'total', headerName: 'Total', numeric: true },
    { field: 'estado', headerName: 'Estado' },
    { field: 'responsable', headerName: 'Responsable' },
];

export default function ComprasPage(): React.JSX.Element {
    const notify = useNotify();
    const { usuario } = useAuth();
    const puedeRegistrar = puedeRegistrarRecepcion(usuario?.rol);
    const [recepciones, setRecepciones] = useState<Recepcion[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorBackend[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const cargar = useCallback(async (): Promise<void> => {
        try {
            const [lista, provs] = await Promise.all([recepcionApi.listar(), proveedorApi.getAll()]);
            setRecepciones(lista);
            setProveedores(provs);
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar las recepciones'));
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void cargar();
    }, [cargar]);

    const rows = useMemo<RecepcionRow[]>(
        () =>
            recepciones.map((r) => ({
                id: r._id,
                numero: r.numeroConsecutivo,
                fecha: (r.fechaEmision ?? '').slice(0, 10),
                proveedor: proveedores.find((p) => p._id === r.proveedor)?.nombre ?? '—',
                documentoOrigen: `${r.documentoOrigen.tipo} ${r.documentoOrigen.numero}`,
                lineas: r.lineas.length,
                total: r.total,
                estado: r.estado,
                responsable: r.responsableRecepcion,
            })),
        [recepciones, proveedores],
    );

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
                        Compras
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Informes de recepción (SC-2-04): las compras entran al inventario al registrarse
                    </Typography>
                </Box>
                <Tooltip title={puedeRegistrar ? '' : 'Solo un administrador, gerente o económico puede registrar recepciones'}>
                    <span>
                        <Button
                            variant="contained"
                            startIcon={<AddShoppingCartIcon />}
                            onClick={() => setDialogOpen(true)}
                            disabled={!puedeRegistrar}
                            sx={{
                                background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                                color: '#fff',
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: 'none',
                            }}
                        >
                            Nueva recepción
                        </Button>
                    </span>
                </Tooltip>
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
                                <CustomDataGrid<RecepcionRow>
                                    title={`Recepciones (${rows.length})`}
                                    rows={rows}
                                    getRowId={(row) => row.id}
                                    columns={columns}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <InformeRecepcionDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onCambio={() => cargar()}
            />
        </Box>
    );
}
