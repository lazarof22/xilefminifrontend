import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Typography,
} from '@mui/material';

import AssessmentIcon from '@mui/icons-material/Assessment';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';

import CustomDataGridR from '../../components/CustomDataGridR';

export interface Column<T> {
    field: keyof T;
    headerName: string;
    numeric?: boolean;
    filterable?: boolean;
    isStatusColumn?: boolean;
}

// ============================================================
// COLORES
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

interface IPVRow {
    id: string;
    productoId: string;

    nombreProducto: string;

    precioCosto: number;
    precioVenta: number;

    inventarioInicial: number;
    entradas: number;
    ajusteDisminucion: number;
    venta: number;

    disponible: number;
    inventarioFinal: number;

    importeVenta: number;
    importeCosto: number;
}

interface IPVTabProps {
    productos: ProductoIPV[];
}

type EditableField =
    | 'inventarioInicial'
    | 'entradas'
    | 'ajusteDisminucion'
    | 'venta';

// ============================================================
// STORAGE
// ============================================================

const STORAGE_KEY = 'ipv_tabla';

// ============================================================
// UTILIDADES
// ============================================================

const toNumber = (value: unknown): number => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(0, number);
};

const calculateRow = (row: IPVRow): IPVRow => {

    const inventarioInicial =
        toNumber(row.inventarioInicial);

    const entradas =
        toNumber(row.entradas);

    const ajusteDisminucion =
        toNumber(row.ajusteDisminucion);

    const venta =
        toNumber(row.venta);

    const precioCosto =
        toNumber(row.precioCosto);

    const precioVenta =
        toNumber(row.precioVenta);

    // --------------------------------------------------------
    // Disponible = Inventario Inicial + Entradas
    //              - Ajuste por Disminución
    // --------------------------------------------------------

    const disponible = Math.max(
        0,
        inventarioInicial +
        entradas -
        ajusteDisminucion
    );

    // --------------------------------------------------------
    // Inventario Final = Disponible - Venta
    // --------------------------------------------------------

    const inventarioFinal = Math.max(
        0,
        disponible - venta
    );

    // --------------------------------------------------------
    // Importe Venta = Precio Venta × Venta
    // --------------------------------------------------------

    const importeVenta =
        precioVenta * venta;

    // --------------------------------------------------------
    // Importe Costo = Precio Costo × Venta
    // --------------------------------------------------------

    const importeCosto =
        precioCosto * venta;

    return {
        ...row,

        inventarioInicial,
        entradas,
        ajusteDisminucion,
        venta,

        precioCosto,
        precioVenta,

        disponible,
        inventarioFinal,

        importeVenta,
        importeCosto,
    };
};

// ============================================================
// COMPONENTE
// ============================================================

export default function IPVTab({
    productos,
}: IPVTabProps) {

    const [rows, setRows] = useState<IPVRow[]>([]);

    const [alert, setAlert] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    // ========================================================
    // CARGAR PRODUCTOS + DATOS GUARDADOS
    // ========================================================

    useEffect(() => {

        let saved: Partial<IPVRow>[] = [];

        try {

            const storage =
                localStorage.getItem(STORAGE_KEY);

            if (storage) {
                const parsed =
                    JSON.parse(storage);

                if (Array.isArray(parsed)) {
                    saved = parsed;
                }
            }

        } catch (error) {

            console.error(
                'Error leyendo datos de IPV:',
                error
            );
        }

        const newRows: IPVRow[] =
            productos.map((producto) => {

                const old =
                    saved.find(
                        (row) =>
                            row.productoId ===
                            producto._id
                    );

                const row: IPVRow = {

                    id: producto._id,

                    productoId:
                        producto._id,

                    nombreProducto:
                        producto.nombre_producto,

                    precioCosto:
                        old?.precioCosto !== undefined
                            ? toNumber(old.precioCosto)
                            : toNumber(
                                producto.precio_compra
                            ),

                    precioVenta:
                        old?.precioVenta !== undefined
                            ? toNumber(old.precioVenta)
                            : toNumber(
                                producto.precio_venta
                            ),

                    inventarioInicial:
                        old?.inventarioInicial !== undefined
                            ? toNumber(
                                old.inventarioInicial
                            )
                            : toNumber(
                                producto.stock_inicial
                            ),

                    entradas:
                        old?.entradas !== undefined
                            ? toNumber(old.entradas)
                            : 0,

                    ajusteDisminucion:
                        old?.ajusteDisminucion !== undefined
                            ? toNumber(
                                old.ajusteDisminucion
                            )
                            : 0,

                    venta:
                        old?.venta !== undefined
                            ? toNumber(old.venta)
                            : 0,

                    disponible: 0,

                    inventarioFinal: 0,

                    importeVenta: 0,

                    importeCosto: 0,
                };

                return calculateRow(row);
            });

        setRows(newRows);

    }, [productos]);

    // ========================================================
    // CALCULAR TODAS LAS FILAS
    // ========================================================

    const calculatedRows = useMemo(() => {

        return rows.map((row) =>
            calculateRow(row)
        );

    }, [rows]);

    // ========================================================
    // TOTALES
    // ========================================================

    const totals = useMemo(() => {

        return calculatedRows.reduce(
            (acc, row) => {

                acc.inicial +=
                    row.inventarioInicial;

                acc.entradas +=
                    row.entradas;

                acc.ajuste +=
                    row.ajusteDisminucion;

                acc.disponible +=
                    row.disponible;

                acc.venta +=
                    row.venta;

                acc.final +=
                    row.inventarioFinal;

                acc.ventaImp +=
                    row.importeVenta;

                acc.costoImp +=
                    row.importeCosto;

                return acc;

            },
            {
                inicial: 0,
                entradas: 0,
                ajuste: 0,
                disponible: 0,
                venta: 0,
                final: 0,
                ventaImp: 0,
                costoImp: 0,
            }
        );

    }, [calculatedRows]);

    // ========================================================
    // COLUMNAS
    // ========================================================

    const columns: Column<IPVRow>[] = [

        {
            field: 'nombreProducto',
            headerName: 'Producto',
        },

        {
            field: 'precioCosto',
            headerName: 'Precio Costo',
            numeric: true,
        },

        {
            field: 'precioVenta',
            headerName: 'Precio Venta',
            numeric: true,
        },

        {
            field: 'inventarioInicial',
            headerName: 'Inventario Inicial',
            numeric: true,
        },

        {
            field: 'entradas',
            headerName: 'Entradas',
            numeric: true,
        },

        {
            field: 'ajusteDisminucion',
            headerName: 'Ajuste por Disminución',
            numeric: true,
        },

        {
            field: 'disponible',
            headerName: 'Disponible en Venta',
            numeric: true,
        },

        {
            field: 'venta',
            headerName: 'Venta',
            numeric: true,
        },

        {
            field: 'inventarioFinal',
            headerName: 'Inventario Final',
            numeric: true,
        },

        {
            field: 'importeVenta',
            headerName: 'Importe de Venta',
            numeric: true,
        },

        {
            field: 'importeCosto',
            headerName: 'Importe de Costo',
            numeric: true,
        },
    ];

    // ========================================================
    // EDITAR FILA
    //
    // CustomDataGridR nos devuelve la fila modificada.
    // Aquí volvemos a convertir los campos numéricos y
    // recalculamos los campos derivados.
    // ========================================================

    const handleEditRow = (updatedRow: IPVRow) => {

        const normalizedRow: IPVRow = {
            ...updatedRow,

            precioCosto:
                toNumber(updatedRow.precioCosto),

            precioVenta:
                toNumber(updatedRow.precioVenta),

            inventarioInicial:
                toNumber(
                    updatedRow.inventarioInicial
                ),

            entradas:
                toNumber(updatedRow.entradas),

            ajusteDisminucion:
                toNumber(
                    updatedRow.ajusteDisminucion
                ),

            venta:
                toNumber(updatedRow.venta),

            disponible:
                0,

            inventarioFinal:
                0,

            importeVenta:
                0,

            importeCosto:
                0,
        };

        const recalculated =
            calculateRow(normalizedRow);

        setRows((currentRows) =>
            currentRows.map((row) =>
                row.id === recalculated.id
                    ? recalculated
                    : row
            )
        );
    };

    // ========================================================
    // GUARDAR
    // ========================================================

    const save = () => {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(calculatedRows)
            );

            setAlert({
                type: 'success',
                message:
                    'Tabla de IPV guardada correctamente.',
            });

            window.setTimeout(() => {
                setAlert(null);
            }, 3000);

        } catch (error) {

            console.error(
                'Error guardando IPV:',
                error
            );

            setAlert({
                type: 'error',
                message:
                    'No se pudieron guardar los datos de IPV.',
            });

        }
    };

    // ========================================================
    // REINICIAR
    // ========================================================

    const reset = () => {

        const confirmed =
            window.confirm(
                '¿Está seguro de reiniciar los datos de IPV?'
            );

        if (!confirmed) {
            return;
        }

        const resetRows =
            productos.map((producto) => {

                const row: IPVRow = {

                    id: producto._id,

                    productoId:
                        producto._id,

                    nombreProducto:
                        producto.nombre_producto,

                    precioCosto:
                        toNumber(
                            producto.precio_compra
                        ),

                    precioVenta:
                        toNumber(
                            producto.precio_venta
                        ),

                    inventarioInicial:
                        toNumber(
                            producto.stock_inicial
                        ),

                    entradas: 0,

                    ajusteDisminucion: 0,

                    venta: 0,

                    disponible: 0,

                    inventarioFinal: 0,

                    importeVenta: 0,

                    importeCosto: 0,
                };

                return calculateRow(row);
            });

        setRows(resetRows);

        localStorage.removeItem(
            STORAGE_KEY
        );

        setAlert({
            type: 'success',
            message:
                'Datos de IPV reiniciados.',
        });

        window.setTimeout(() => {
            setAlert(null);
        }, 3000);
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <Box
            sx={{
                width: '100%',
            }}
        >

            {/* ==================================================
                ALERTA
            ================================================== */}

            {alert && (
                <Alert
                    severity={alert.type}
                    onClose={() =>
                        setAlert(null)
                    }
                    sx={{
                        mb: 2,
                        borderRadius: 2,

                        bgcolor:
                            alert.type === 'success'
                                ? 'rgba(0,229,160,.1)'
                                : 'rgba(239,68,68,.1)',

                        color:
                            alert.type === 'success'
                                ? COLORS.accent
                                : COLORS.danger,

                        border:
                            `1px solid ${
                                alert.type === 'success'
                                    ? 'rgba(0,229,160,.3)'
                                    : 'rgba(239,68,68,.3)'
                            }`,
                    }}
                >
                    {alert.message}
                </Alert>
            )}

            {/* ==================================================
                BLOQUE SUPERIOR
            ================================================== */}

            <Card
                elevation={0}
                sx={{
                    borderRadius: 3,

                    border:
                        `1px solid ${COLORS.border}`,

                    bgcolor:
                        COLORS.card,

                    boxShadow:
                        '0 2px 12px rgba(0,0,0,.35)',

                    m: 1,

                    overflow: 'hidden',
                }}
            >

                <CardContent
                    sx={{
                        p: 3,
                    }}
                >

                    {/* ==================================================
                        CABECERA
                    ================================================== */}

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent:
                                'space-between',

                            mb: 3,

                            flexWrap: 'wrap',

                            gap: 2,
                        }}
                    >

                        <Box>

                            <Typography
                                variant="h6"
                                sx={{
                                    color:
                                        COLORS.accent,

                                    fontWeight: 700,

                                    display: 'flex',

                                    alignItems:
                                        'center',

                                    gap: 1,
                                }}
                            >
                                <AssessmentIcon />

                                Tabla de IPV
                            </Typography>

                            <Typography
                                variant="body2"
                                sx={{
                                    color:
                                        COLORS.textMuted,

                                    mt: 0.5,
                                }}
                            >
                                Control de inventario,
                                entradas, ventas y
                                valores de los productos.
                            </Typography>

                        </Box>

                        <Chip
                            label={
                                `${calculatedRows.length} productos`
                            }
                            size="small"
                            sx={{
                                bgcolor:
                                    COLORS.accentSoft,

                                color:
                                    COLORS.accent,

                                fontWeight: 600,

                                borderRadius: 2,

                                border:
                                    '1px solid rgba(0,229,160,.25)',
                            }}
                        />

                    </Box>

                    <Divider
                        sx={{
                            mb: 3,
                            borderColor:
                                COLORS.border,
                        }}
                    />

                    {/* ==================================================
                        RESUMEN
                    ================================================== */}

                    <Typography
                        variant="subtitle2"
                        sx={{
                            color:
                                COLORS.accent,

                            fontWeight: 700,

                            mb: 1.5,

                            textTransform:
                                'uppercase',

                            fontSize:
                                '0.75rem',

                            letterSpacing:
                                '0.05em',
                        }}
                    >
                        Resumen
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',

                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(2, 1fr)',
                                md: 'repeat(4, 1fr)',
                            },

                            gap: 2,

                            mb: 3,
                        }}
                    >

                        {/* DISPONIBLE */}

                        <Box
                            sx={{
                                p: 1.5,

                                borderRadius: 2,

                                bgcolor:
                                    'rgba(255,255,255,.025)',

                                border:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >

                            <Typography
                                variant="caption"
                                sx={{
                                    color:
                                        COLORS.textMuted,
                                }}
                            >
                                Disponible en Venta
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    color:
                                        COLORS.textLight,

                                    fontWeight: 800,
                                }}
                            >
                                {totals.disponible}
                            </Typography>

                        </Box>

                        {/* VENTA */}

                        <Box
                            sx={{
                                p: 1.5,

                                borderRadius: 2,

                                bgcolor:
                                    'rgba(255,255,255,.025)',

                                border:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >

                            <Typography
                                variant="caption"
                                sx={{
                                    color:
                                        COLORS.textMuted,
                                }}
                            >
                                Venta
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    color:
                                        COLORS.textLight,

                                    fontWeight: 800,
                                }}
                            >
                                {totals.venta}
                            </Typography>

                        </Box>

                        {/* INVENTARIO FINAL */}

                        <Box
                            sx={{
                                p: 1.5,

                                borderRadius: 2,

                                bgcolor:
                                    'rgba(255,255,255,.025)',

                                border:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >

                            <Typography
                                variant="caption"
                                sx={{
                                    color:
                                        COLORS.textMuted,
                                }}
                            >
                                Inventario Final
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    color:
                                        COLORS.textLight,

                                    fontWeight: 800,
                                }}
                            >
                                {totals.final}
                            </Typography>

                        </Box>

                        {/* IMPORTE VENTA */}

                        <Box
                            sx={{
                                p: 1.5,

                                borderRadius: 2,

                                bgcolor:
                                    'rgba(255,255,255,.025)',

                                border:
                                    `1px solid ${COLORS.border}`,
                            }}
                        >

                            <Typography
                                variant="caption"
                                sx={{
                                    color:
                                        COLORS.textMuted,
                                }}
                            >
                                Importe de Venta
                            </Typography>

                            <Typography
                                variant="h6"
                                sx={{
                                    color:
                                        COLORS.accent,

                                    fontWeight: 800,
                                }}
                            >
                                {totals.ventaImp.toFixed(2)}
                            </Typography>

                        </Box>

                    </Box>

                    {/* ==================================================
                        BOTONES
                    ================================================== */}

                    <Box
                        sx={{
                            display: 'flex',

                            gap: 2,

                            flexWrap: 'wrap',

                            mb: 3,
                        }}
                    >

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={
                                <SaveIcon />
                            }
                            onClick={save}
                            sx={{
                                textTransform:
                                    'none',

                                fontWeight: 600,

                                borderRadius: 2,
                            }}
                        >
                            Guardar IPV
                        </Button>

                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={
                                <RefreshIcon />
                            }
                            onClick={reset}
                            sx={{
                                textTransform:
                                    'none',

                                fontWeight: 600,

                                borderRadius: 2,

                                color:
                                    'rgb(220,20,60)',

                                borderColor:
                                    'rgba(220,20,60,.3)',
                            }}
                        >
                            Reiniciar Datos
                        </Button>

                    </Box>

                    {/* ==================================================
                        DATAGRID
                    ================================================== */}

                    <CustomDataGridR<IPVRow>
                        rows={calculatedRows}
                        columns={columns}
                        getRowId={(row) =>
                            row.id
                        }
                        title="Control de Inventario y Ventas"
                        onEditRow={
                            handleEditRow
                        }
                    />

                </CardContent>

            </Card>

        </Box>
    );
}
