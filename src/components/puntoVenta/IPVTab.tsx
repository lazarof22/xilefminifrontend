import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CustomDataGridR, { type Column } from '../CustomDataGridR';
import { useNotify } from '../notificaciones/useNotify';
import { guardarIpv, obtenerIpv, reiniciarIpv, type IpvFila } from '../../service/ipvApi';
import { fechaHoyLocal } from '../../service/httpClient';

// ============================================================
// COLORES (alineados con theme/MuiProvider.tsx)
// ============================================================
const COLORS = {
    card: '#151a19',
    cardAlt: '#1a201e',
    border: 'rgba(255,255,255,0.06)',
    accent: '#00e5a0',
    accentSoft: 'rgba(0,229,160,0.08)',
    textMuted: '#9ca3af',
    textLight: '#e5e7eb',
    danger: '#ef4444',
    warning: '#f59e0b',
};

// ============================================================
// TIPOS
// ============================================================
export interface ProductoIPV {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    estado: string;
}

interface IPVRow extends IpvFila {
    id: string;
    estadoFila: string;
}

interface IPVTabProps {
    /** Se usa para recargar el IPV cuando cambia el catálogo de productos. */
    productos: ProductoIPV[];
}

// ============================================================
// UTILIDADES
// ============================================================
const toNumber = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Misma fórmula que el backend (IpvService.calcularFila). */
const calculateRow = (row: IPVRow): IPVRow => {
    const inventarioInicial = toNumber(row.inventarioInicial);
    const entradas = toNumber(row.entradas);
    const ajusteDisminucion = toNumber(row.ajusteDisminucion);
    const venta = toNumber(row.venta);
    const precioCosto = toNumber(row.precioCosto);
    const precioVenta = toNumber(row.precioVenta);

    const disponible = Math.max(0, inventarioInicial + entradas - ajusteDisminucion);
    const inventarioFinal = Math.max(0, disponible - venta);

    return {
        ...row,
        inventarioInicial,
        entradas,
        ajusteDisminucion,
        venta,
        precioCosto,
        precioVenta,
        disponible: redondear(disponible),
        inventarioFinal: redondear(inventarioFinal),
        importeVenta: redondear(precioVenta * venta),
        importeCosto: redondear(precioCosto * venta),
    };
};

const toRow = (fila: IpvFila): IPVRow =>
    calculateRow({
        ...fila,
        id: fila.productoId,
        estadoFila: fila.guardado ? 'Guardado' : 'Sugerido',
    });

const money = (n: number) =>
    `$${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ============================================================
// COMPONENTE
// ============================================================
export default function IPVTab({ productos }: IPVTabProps) {
    const notify = useNotify();
    const [fecha, setFecha] = useState(fechaHoyLocal());
    const [rows, setRows] = useState<IPVRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [dirty, setDirty] = useState(false);

    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let activo = true;
        obtenerIpv(fecha)
            .then((dia) => {
                if (!activo) return;
                setRows(dia.items.map(toRow));
                setGuardado(dia.guardado);
                setDirty(false);
            })
            .catch((error: unknown) => {
                if (activo) notify.error(error instanceof Error ? error.message : 'No se pudo cargar el IPV.');
            })
            .finally(() => {
                if (activo) setLoading(false);
            });
        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, reloadKey, productos.length]);

    const recargar = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    const cambiarFecha = (valor: string) => {
        setLoading(true);
        setFecha(valor || fechaHoyLocal());
    };

    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, row) => {
                    acc.inicial += row.inventarioInicial;
                    acc.entradas += row.entradas;
                    acc.ajuste += row.ajusteDisminucion;
                    acc.disponible += row.disponible;
                    acc.venta += row.venta;
                    acc.final += row.inventarioFinal;
                    acc.ventaImp += row.importeVenta;
                    acc.costoImp += row.importeCosto;
                    return acc;
                },
                { inicial: 0, entradas: 0, ajuste: 0, disponible: 0, venta: 0, final: 0, ventaImp: 0, costoImp: 0 },
            ),
        [rows],
    );

    const columns: Column<IPVRow>[] = [
        { field: 'codigoProducto', headerName: 'Código', editable: false },
        { field: 'nombreProducto', headerName: 'Producto', editable: false },
        { field: 'precioCosto', headerName: 'Precio Costo', numeric: true },
        { field: 'precioVenta', headerName: 'Precio Venta', numeric: true },
        { field: 'inventarioInicial', headerName: 'Inventario Inicial', numeric: true },
        { field: 'entradas', headerName: 'Entradas', numeric: true },
        { field: 'ajusteDisminucion', headerName: 'Ajuste por Disminución', numeric: true },
        { field: 'disponible', headerName: 'Disponible en Venta', numeric: true, editable: false },
        { field: 'venta', headerName: 'Venta', numeric: true },
        { field: 'inventarioFinal', headerName: 'Inventario Final', numeric: true, editable: false },
        { field: 'importeVenta', headerName: 'Importe Venta', numeric: true, editable: false },
        { field: 'importeCosto', headerName: 'Importe Costo', numeric: true, editable: false },
        { field: 'estadoFila', headerName: 'Estado', isStatusColumn: true, editable: false },
    ];

    const handleEditRow = (updated: IPVRow) => {
        setRows((current) =>
            current.map((row) =>
                row.id === updated.id
                    ? calculateRow({
                          ...row,
                          precioCosto: toNumber(updated.precioCosto),
                          precioVenta: toNumber(updated.precioVenta),
                          inventarioInicial: toNumber(updated.inventarioInicial),
                          entradas: toNumber(updated.entradas),
                          ajusteDisminucion: toNumber(updated.ajusteDisminucion),
                          venta: toNumber(updated.venta),
                          estadoFila: 'Modificado',
                      })
                    : row,
            ),
        );
        setDirty(true);
    };

    const save = async () => {
        if (!rows.length) return;
        setSaving(true);
        try {
            const dia = await guardarIpv(
                fecha,
                rows.map((row) => ({
                    producto: row.productoId,
                    precioCosto: row.precioCosto,
                    precioVenta: row.precioVenta,
                    inventarioInicial: row.inventarioInicial,
                    entradas: row.entradas,
                    ajusteDisminucion: row.ajusteDisminucion,
                    venta: row.venta,
                })),
            );
            setRows(dia.items.map(toRow));
            setGuardado(dia.guardado);
            setDirty(false);
            notify.success('IPV guardado correctamente.');
        } catch (error) {
            notify.error(error instanceof Error ? error.message : 'No se pudo guardar el IPV.');
        } finally {
            setSaving(false);
        }
    };

    const reset = async () => {
        if (!window.confirm(`¿Eliminar el IPV guardado del ${fecha} y volver a los valores sugeridos?`)) return;
        try {
            const { eliminados } = await reiniciarIpv(fecha);
            notify.success(`IPV reiniciado (${eliminados} filas eliminadas).`);
            recargar();
        } catch (error) {
            notify.error(error instanceof Error ? error.message : 'No se pudo reiniciar el IPV.');
        }
    };

    const resumen = [
        { label: 'Inventario inicial', value: totals.inicial.toLocaleString('es-ES') },
        { label: 'Entradas', value: totals.entradas.toLocaleString('es-ES') },
        { label: 'Ajustes', value: totals.ajuste.toLocaleString('es-ES') },
        { label: 'Disponible', value: totals.disponible.toLocaleString('es-ES') },
        { label: 'Unidades vendidas', value: totals.venta.toLocaleString('es-ES') },
        { label: 'Inventario final', value: totals.final.toLocaleString('es-ES') },
        { label: 'Importe venta', value: money(totals.ventaImp), accent: true },
        { label: 'Importe costo', value: money(totals.costoImp) },
        { label: 'Utilidad', value: money(totals.ventaImp - totals.costoImp), accent: true },
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,
                    border: `1px solid ${COLORS.border}`,
                    bgcolor: COLORS.card,
                    boxShadow: '0 2px 12px rgba(0,0,0,.35)',
                    m: 1,
                    overflow: 'hidden',
                }}
            >
                <CardContent sx={{ p: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 3,
                            flexWrap: 'wrap',
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{ color: COLORS.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                                <AssessmentIcon />
                                Tabla de IPV
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textMuted, mt: 0.5 }}>
                                Inventario inicial, entradas, ajustes y ventas del día. Los valores sugeridos se
                                calculan con las ventas y el Kardex; edítelos y guarde para cerrar el IPV.
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip
                                label={guardado ? 'IPV guardado' : 'Sin guardar'}
                                sx={{
                                    bgcolor: guardado ? COLORS.accentSoft : 'rgba(245,158,11,0.1)',
                                    color: guardado ? COLORS.accent : COLORS.warning,
                                    fontWeight: 600,
                                }}
                            />
                            {dirty && (
                                <Chip
                                    label="Cambios sin guardar"
                                    sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: COLORS.danger, fontWeight: 600 }}
                                />
                            )}
                            <Chip
                                label={`${rows.length} productos`}
                                sx={{ bgcolor: COLORS.cardAlt, color: COLORS.textLight, fontWeight: 600 }}
                            />
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 3 }}>
                        <TextField
                            label="Fecha"
                            type="date"
                            size="small"
                            value={fecha}
                            onChange={(e) => cambiarFecha(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={recargar} disabled={loading}>
                            Recargar
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                            onClick={() => void save()}
                            disabled={saving || loading || !rows.length}
                        >
                            Guardar IPV
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<RestartAltIcon />}
                            onClick={() => void reset()}
                            disabled={!guardado || loading}
                        >
                            Reiniciar día
                        </Button>
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(9, 1fr)' },
                            gap: 1.5,
                        }}
                    >
                        {resumen.map((item) => (
                            <Box
                                key={item.label}
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: item.accent ? COLORS.accentSoft : COLORS.cardAlt,
                                    border: `1px solid ${COLORS.border}`,
                                }}
                            >
                                <Typography variant="caption" sx={{ color: COLORS.textMuted }}>
                                    {item.label}
                                </Typography>
                                <Typography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 700, color: item.accent ? COLORS.accent : COLORS.textLight }}
                                >
                                    {item.value}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ m: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress sx={{ color: COLORS.accent }} />
                    </Box>
                ) : (
                    <CustomDataGridR<IPVRow>
                        rows={rows}
                        columns={columns}
                        getRowId={(row) => row.id}
                        title={`IPV del ${fecha}`}
                        onEditRow={handleEditRow}
                    />
                )}
            </Box>
        </Box>
    );
}
