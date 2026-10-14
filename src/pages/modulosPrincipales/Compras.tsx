// src/pages/modulosPrincipales/Compras.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, CircularProgress, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CustomDataGrid, { type Column } from '../../components/CustomDataGridR';
import RegistrarCompraDialog from '../../components/compras/RegistrarCompraDialog';
import { useNotify } from '../../components/notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { compraApi, type CompraBackend } from '../../service/compraApi';

interface CompraRow {
    id: string;
    numeroFactura: string;
    nombreProveedor: string;
    nombreProducto: string;
    fechaCompra: string;
    moneda: string;
    tasaMercadoInformal: number | string;
    tasaBancoNacional: number | string;
    precioCompra: number;
    cantidad: number;
    iva: number;
    totalPagado: number;
    metodoPago: string;
}

const ETIQUETA_PAGO: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    credito: 'Crédito',
};

const aFila = (c: CompraBackend): CompraRow => ({
    id: c._id,
    numeroFactura: c.numeroFactura,
    nombreProveedor: c.nombreProveedor,
    nombreProducto: c.nombreProducto,
    fechaCompra: (c.fechaCompra ?? '').slice(0, 10),
    moneda: c.moneda,
    tasaMercadoInformal: c.tasaMercadoInformal ?? '—',
    tasaBancoNacional: c.tasaBancoNacional ?? '—',
    precioCompra: c.precioCompra,
    cantidad: c.cantidad,
    iva: c.iva,
    totalPagado: c.totalPagado,
    metodoPago: ETIQUETA_PAGO[c.metodoPago] ?? c.metodoPago,
});

const columns: Column<CompraRow>[] = [
    { field: 'numeroFactura', headerName: 'Factura' },
    { field: 'nombreProveedor', headerName: 'Proveedor' },
    { field: 'nombreProducto', headerName: 'Producto' },
    { field: 'fechaCompra', headerName: 'Fecha', type: 'date' },
    { field: 'moneda', headerName: 'Moneda' },
    { field: 'tasaMercadoInformal', headerName: 'Tasa informal' },
    { field: 'tasaBancoNacional', headerName: 'Tasa banco nacional' },
    { field: 'precioCompra', headerName: 'Precio de compra', numeric: true },
    { field: 'cantidad', headerName: 'Cantidad', numeric: true },
    { field: 'iva', headerName: 'IVA', numeric: true },
    { field: 'totalPagado', headerName: 'Total pagado', numeric: true },
    { field: 'metodoPago', headerName: 'Método de pago' },
];

export default function ComprasPage(): React.JSX.Element {
    const notify = useNotify();
    const [compras, setCompras] = useState<CompraBackend[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    const cargarCompras = useCallback(async (): Promise<void> => {
        try {
            setCompras(await compraApi.getAll());
        } catch (error: unknown) {
            notify.error(getErrorMessage(error, 'No se pudieron cargar las compras'));
        } finally {
            setLoading(false);
        }
    }, [notify]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void cargarCompras();
    }, [cargarCompras]);

    const rows = useMemo(() => compras.map(aFila), [compras]);

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
                        Módulo de gestión de compras
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddShoppingCartIcon />}
                    onClick={() => setDialogOpen(true)}
                    sx={{
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                    }}
                >
                    Registrar compra
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
                                <CustomDataGrid<CompraRow>
                                    title={`Compras registradas (${rows.length})`}
                                    rows={rows}
                                    getRowId={(row) => row.id}
                                    columns={columns}
                                />
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            <RegistrarCompraDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onGuardada={() => void cargarCompras()}
            />
        </Box>
    );
}
