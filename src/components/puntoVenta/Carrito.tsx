// src/components/puntoVenta/Carrito.tsx
import React, { useState } from 'react';
import {
    Card,
    Typography,
    Box,
    IconButton,
    Button,
    Divider,
    Avatar,
    Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MoneyIcon from '@mui/icons-material/Money';
import PaymentIcon from '@mui/icons-material/Payment';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DialogPagoEfectivo, { type PagoEfectivoData } from './dialogsDePagos/PagoEfectivoDialog';
import DialogPagoCredito, { type PagoCreditoData } from './dialogsDePagos/PagoCreditoDialog';
import DialogPagoTransferencia, { type PagoTransferenciaData } from './dialogsDePagos/PagoTransferenciaDialog';
import LoginExtraccionDialog from './dialogsDePagos/LoginExtraccionDialog';
import ExtraccionDialog, { type ExtraccionData } from './dialogsDePagos/ExtraccionDialog';
import type { ProductoCarrito } from '../../types/venta.types';

// ─── Tipos ─────────────────────────────────────────────
// Línea del carrito: la forma que esperan los diálogos de pago, más una
// descripción opcional que solo se usa para mostrarla en la lista.
export type CarritoItem = ProductoCarrito & { descripcion?: string };

export interface CarritoTabProps {
    /** Líneas del carrito (el estado vive en la página para compartirlo con el catálogo y la insignia de la pestaña). */
    carrito: CarritoItem[];
    onCarritoChange: React.Dispatch<React.SetStateAction<CarritoItem[]>>;
    /** Moneda en la que se muestran los importes (ej: "CUP"). */
    moneda: string;
    /** Impuesto a aplicar sobre la base imponible, en %. */
    impuesto: number;
    /** _id del cliente seleccionado en la venta (opcional). */
    clienteId?: string;
    /** Se llama cuando un diálogo de pago registra la venta con éxito. */
    onVentaExitosa: (ventaId: string) => void;
}

// ─── Estilos compartidos ───────────────────────────────
// Los colores salen del tema (MuiProvider); aquí solo se define la forma.
const encabezadoColumna = {
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontSize: '0.7rem',
} as const;

// Botones ± y de pago: se conservan tal cual estaban.
const botonCantidadSx = {
    minWidth: 32,
    height: 32,
    p: 0,
    borderRadius: 1,
    border: 'none',
    bgcolor: 'rgba(255, 174, 0, 0.78)',
    color: 'rgb(255, 255, 255)',
    '&:hover': {
        bgcolor: 'rgb(255, 166, 0)',
    },
} as const;

const valorContadorSx = {
    fontWeight: 700,
    minWidth: 28,
    textAlign: 'center',
    fontSize: '0.9rem',
    color: 'text.primary',
} as const;

// ─── Componente ──────────────────────────────────────
export default function CarritoTab({
    carrito,
    onCarritoChange,
    moneda,
    impuesto,
    clienteId,
    onVentaExitosa,
}: CarritoTabProps): React.JSX.Element {
    // Diálogos de pago / extracción
    const [openPago, setOpenPago] = useState(false);
    const [openPagoCredito, setOpenPagoCredito] = useState(false);
    const [openPagoTransferencia, setOpenPagoTransferencia] = useState(false);
    const [openLoginExtraccion, setOpenLoginExtraccion] = useState(false);
    const [openExtraccion, setOpenExtraccion] = useState(false);

    // ─── Totales ─────────────────────────────────────
    const subtotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const descuento = carrito.reduce((acc, item) => acc + item.descuento, 0);
    const montoDescuento = subtotal * (descuento / 100);
    const base = subtotal - montoDescuento;
    const montoImpuesto = base * (impuesto / 100);
    const totalFinal = base + montoImpuesto;

    // ─── Acciones sobre el carrito ───────────────────
    const quitarProducto = (id: string) => {
        onCarritoChange((prev) => prev.filter((p) => p.id !== id));
    };

    const aumentarCantidad = (id: string) => {
        const item = carrito.find((p) => p.id === id);
        if (!item) return;
        if (item.cantidad >= item.stock) {
            alert('No hay más stock disponible');
            return;
        }
        onCarritoChange((prev) =>
            prev.map((p) => (p.id === id ? { ...p, cantidad: p.cantidad + 1 } : p))
        );
    };

    const disminuirCantidad = (id: string) => {
        onCarritoChange((prev) =>
            prev
                .map((item) =>
                    item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
                )
                .filter((item) => item.cantidad > 0)
        );
    };

    const aumentarDescuento = (id: string) => {
        onCarritoChange((prev) =>
            prev.map((item) =>
                item.id === id && item.descuento < 100
                    ? { ...item, descuento: item.descuento + 1 }
                    : item
            )
        );
    };

    const disminuirDescuento = (id: string) => {
        onCarritoChange((prev) =>
            prev.map((item) =>
                item.id === id && item.descuento > 0
                    ? { ...item, descuento: item.descuento - 1 }
                    : item
            )
        );
    };

    // ─── Handlers de pagos ───────────────────────────
    const handleOpenPago = (): void => setOpenPago(true);
    const handleClosePago = (): void => setOpenPago(false);
    const handlePagoCompletado = (data: PagoEfectivoData): void => {
        console.log('Pago procesado:', data);
    };

    const handleOpenPagoCredito = (): void => setOpenPagoCredito(true);
    const handleClosePagoCredito = (): void => setOpenPagoCredito(false);
    const handlePagoCreditoCompletado = (data: PagoCreditoData): void => {
        console.log('Pago a crédito procesado:', data);
    };

    const handleOpenPagoTransferencia = (): void => setOpenPagoTransferencia(true);
    const handleClosePagoTransferencia = (): void => setOpenPagoTransferencia(false);
    const handlePagoTransferenciaCompletado = (data: PagoTransferenciaData): void => {
        console.log('Transferencia procesada:', data);
    };

    const handleOpenExtraccion = (): void => setOpenLoginExtraccion(true); // Primero abre el login
    const handleLoginSuccess = (): void => setOpenExtraccion(true); // Login OK → abre extracción
    const handleCloseLogin = (): void => setOpenLoginExtraccion(false);
    const handleCloseExtraccion = (): void => setOpenExtraccion(false);
    const handleExtraccionCompletada = (data: ExtraccionData): void => {
        console.log('Extracción registrada:', data);
        // Aquí puedes: actualizar saldo de caja, refrescar reportes, etc.
    };

    return (
        <Card
            sx={{
                height: '100%',
                minHeight: 600, // Altura mínima fija para mantener consistencia
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' }, // Apilado en móvil, lado a lado en desktop
                overflow: 'hidden',
                m: 1,
            }}
        >
            {/* ========== LADO IZQUIERDO: LISTA DE PRODUCTOS ========== */}
            <Box
                sx={{
                    flex: '1 1 70%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: { xs: 2, md: 3 },
                    // Propiedades sueltas (no el atajo `border`) para que el color del tema no se reinicie
                    borderStyle: 'solid',
                    borderWidth: { xs: '0 0 1px 0', md: '0 1px 0 0' },
                    borderColor: 'divider',
                    minHeight: { xs: 300, md: 'auto' },
                    overflow: 'hidden',
                    bgcolor: 'background.default',
                }}
            >
                {/* ═══ HEADER: Carrito de Compras ═══ */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            p: 1,
                            textAlign: 'center',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <ShoppingCartIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                        Carrito de Compras
                    </Typography>

                    <Chip
                        label={`${carrito.length} productos`}
                        color="primary"
                        size="medium"
                        sx={{ p: 1 }}
                    />
                </Box>

                {/* ═══ TABLA HEADER (Producto | Cantidad | Precio | Descuento | Total) ═══ */}
                <Divider sx={{ my: 1 }} />

                <Box
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        px: 2,
                        py: 1,
                        mb: 1,
                    }}
                >
                    <Typography variant="caption" sx={{ ...encabezadoColumna, flex: 2, mr: 4 }}>
                        Producto
                    </Typography>
                    <Typography variant="caption" sx={{ ...encabezadoColumna, flex: 1, textAlign: 'center' }}>
                        Cantidad
                    </Typography>
                    <Typography variant="caption" sx={{ ...encabezadoColumna, flex: 1, textAlign: 'center' }}>
                        Precio
                    </Typography>
                    <Typography variant="caption" sx={{ ...encabezadoColumna, flex: 1, textAlign: 'center' }}>
                        Descuento
                    </Typography>
                    <Typography variant="caption" sx={{ ...encabezadoColumna, flex: 1, textAlign: 'right' }}>
                        Total
                    </Typography>
                    <Box sx={{ width: 48 }} /> {/* Espacio para botón eliminar */}
                </Box>

                {/* ═══ LISTA DE PRODUCTOS ═══ */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                    }}
                >
                    {carrito.length === 0 ? (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                minHeight: 250,
                                gap: 2,
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                }}
                            >
                                <ShoppingCartIcon sx={{ fontSize: 40 }} />
                            </Avatar>
                            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                                No hay productos en el carrito
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                                Agrega productos para comenzar
                            </Typography>
                        </Box>
                    ) : (
                        carrito.map((item) => {
                            const totalItem = (
                                item.cantidad *
                                item.precio *
                                (1 - item.descuento / 100)
                            ).toFixed(2);

                            return (
                                <Card
                                    key={item.id}
                                    elevation={0}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: 2,
                                        borderRadius: 3,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            borderColor: (theme) => alpha(theme.palette.primary.main, 0.25),
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    {/* ─── IMAGEN PLACEHOLDER ─── */}
                                    <Avatar
                                        variant="rounded"
                                        sx={{
                                            width: 64,
                                            height: 64,
                                            bgcolor: 'action.hover',
                                            color: 'text.secondary',
                                            mr: 2,
                                            flexShrink: 0,
                                            borderRadius: 2,
                                        }}
                                    >
                                        <ImageIcon sx={{ fontSize: 28 }} />
                                    </Avatar>

                                    {/* ─── INFO PRODUCTO ─── */}
                                    <Box sx={{ flex: 2, minWidth: 0, mr: -6 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                fontSize: '0.95rem',
                                                color: 'text.primary',
                                                mb: 0.5,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item.nombre}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'text.secondary',
                                                display: 'block',
                                                mb: 0.5,
                                            }}
                                        >
                                            {item.descripcion || 'Producto del inventario'}
                                        </Typography>
                                    </Box>

                                    {/* ─── CANTIDAD (botones ±) ─── */}
                                    <Box
                                        sx={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Button onClick={() => disminuirCantidad(item.id)} sx={botonCantidadSx}>
                                            <RemoveIcon sx={{ fontSize: 16 }} />
                                        </Button>

                                        <Typography sx={valorContadorSx}>{item.cantidad}</Typography>

                                        <Button onClick={() => aumentarCantidad(item.id)} sx={botonCantidadSx}>
                                            <AddIcon sx={{ fontSize: 16 }} />
                                        </Button>
                                    </Box>

                                    {/* ─── PRECIO UNITARIO ─── */}
                                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                color: 'text.secondary',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            {item.precio.toFixed(2)} {moneda}
                                        </Typography>
                                    </Box>

                                    {/* ─── DESCUENTO ─── */}
                                    <Box
                                        sx={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Button onClick={() => disminuirDescuento(item.id)} sx={botonCantidadSx}>
                                            <RemoveIcon sx={{ fontSize: 16 }} />
                                        </Button>

                                        <Typography sx={valorContadorSx}>{item.descuento}%</Typography>

                                        <Button onClick={() => aumentarDescuento(item.id)} sx={botonCantidadSx}>
                                            <AddIcon sx={{ fontSize: 16 }} />
                                        </Button>
                                    </Box>

                                    {/* ─── TOTAL ─── */}
                                    <Box sx={{ flex: 1, textAlign: 'right', mr: 2 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 700,
                                                color: 'text.primary',
                                                fontSize: '0.95rem',
                                            }}
                                        >
                                            {totalItem} {moneda}
                                        </Typography>
                                    </Box>

                                    {/* ─── ELIMINAR ─── */}
                                    <IconButton
                                        onClick={() => quitarProducto(item.id)}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            bgcolor: 'rgb(220, 20, 60)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            '&:hover': {
                                                bgcolor: 'rgb(200, 10, 40)',
                                                transform: 'scale(1.05)',
                                            },
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Card>
                            );
                        })
                    )}
                </Box>
            </Box>

            {/* ========== LADO DERECHO: FACTURACIÓN ========== */}
            <Box
                sx={{
                    flex: '1 1 40%',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 3,
                    bgcolor: 'background.paper',
                    overflowY: 'auto', // Scroll si el contenido es muy largo
                    minHeight: { xs: 400, md: 'auto' }, // Altura mínima en móvil
                }}
            >
                {/* 💰 Totales */}
                <Box sx={{ mb: 2 }}>
                    <Typography
                        variant="h6"
                        sx={{
                            p: 1,
                            textAlign: 'center',
                            color: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                        }}
                    >
                        <ReceiptLongIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                        Factura
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography color="text.secondary">Subtotal</Typography>
                        <Typography variant="button" color="success.main">
                            {subtotal.toFixed(2)} {moneda}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography color="text.secondary">Descuento</Typography>
                        <Typography variant="button" color="error.main">
                            -{montoDescuento.toFixed(2)} {moneda}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography color="text.secondary">Impuesto</Typography>
                        <Typography>+{montoImpuesto.toFixed(2)} {moneda}</Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            mt: 1,
                            pt: 1,
                            borderTop: '2px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            Total General:
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                            {totalFinal.toFixed(2)} {moneda}
                        </Typography>
                    </Box>
                </Box>

                {/* 💳 Pago */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr', // 2 columnas
                        gridTemplateRows: '1fr 1fr', // 2 filas
                        gap: 2,
                        width: '100%',
                    }}
                >
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<MoneyIcon sx={{ fontSize: 'medium' }} />}
                        onClick={handleOpenPago}
                        sx={{
                            ml: 1,
                            background: 'linear-gradient(135deg, rgb(36, 236, 9), rgba(202, 183, 14, 0.9))',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 19px rgba(0,0,0,0.2)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgb(36, 236, 9), rgba(202, 183, 14, 0.9))',
                                boxShadow: '0 4px 12px rgb(24, 158, 6)',
                            },
                        }}
                    >
                        Efectivo
                    </Button>
                    <DialogPagoEfectivo
                        open={openPago}
                        onClose={handleClosePago}
                        montoTotal={totalFinal}
                        clienteId={clienteId || ''}
                        productosCarrito={carrito}
                        subtotal={subtotal}
                        descuentoTotal={montoDescuento}
                        impuesto={montoImpuesto}
                        onPagoCompletado={handlePagoCompletado}
                        onVentaExitosa={onVentaExitosa}
                    />

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PaymentIcon sx={{ fontSize: 'medium' }} />}
                        onClick={handleOpenPagoCredito}
                        sx={{
                            ml: 1,
                            background: 'linear-gradient(135deg, rgb(255, 238, 0), rgba(226, 64, 14, 0.9))',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 19px rgba(0,0,0,0.2)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgb(255, 238, 0), rgba(226, 64, 14, 0.9))',
                                boxShadow: '0 4px 12px rgb(238, 102, 12)',
                            },
                        }}
                    >
                        Credito
                    </Button>
                    <DialogPagoCredito
                        open={openPagoCredito}
                        onClose={handleClosePagoCredito}
                        montoTotal={totalFinal}
                        productosCarrito={carrito}
                        subtotal={subtotal}
                        descuentoTotal={montoDescuento}
                        impuesto={montoImpuesto}
                        onPagoCompletado={handlePagoCreditoCompletado}
                        onVentaExitosa={onVentaExitosa}
                    />

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PhoneAndroidIcon sx={{ fontSize: 'medium' }} />}
                        onClick={handleOpenPagoTransferencia}
                        sx={{
                            ml: 1,
                            background: 'linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 19px rgba(0,0,0,0.2)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))',
                                boxShadow: '0 4px 12px rgb(12, 83, 235)',
                            },
                        }}
                    >
                        Transferencia
                    </Button>
                    <DialogPagoTransferencia
                        open={openPagoTransferencia}
                        onClose={handleClosePagoTransferencia}
                        montoTotal={totalFinal}
                        productosCarrito={carrito}
                        subtotal={subtotal}
                        descuentoTotal={montoDescuento}
                        impuesto={montoImpuesto}
                        onPagoCompletado={handlePagoTransferenciaCompletado}
                        onVentaExitosa={onVentaExitosa}
                    />

                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PhoneAndroidIcon sx={{ fontSize: 'medium' }} />}
                        onClick={handleOpenExtraccion}
                        sx={{
                            ml: 1,
                            background: 'linear-gradient(135deg, rgb(6, 70, 245), rgba(45, 218, 10, 0.9))',
                            color: '#fff',
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 4px 19px rgba(0,0,0,0.2)',
                            '&:hover': {
                                background: 'linear-gradient(135deg, rgb(6, 70, 245), rgba(45, 218, 10, 0.9))',
                                boxShadow: '0 4px 12px rgb(12, 190, 235)',
                            },
                        }}
                    >
                        Extracción
                    </Button>
                    <LoginExtraccionDialog
                        open={openLoginExtraccion}
                        onClose={handleCloseLogin}
                        onLoginSuccess={handleLoginSuccess}
                    />

                    <ExtraccionDialog
                        open={openExtraccion}
                        onClose={handleCloseExtraccion}
                        saldoDisponible={totalFinal} // o el saldo real de tu caja
                        onExtraccionCompletada={handleExtraccionCompletada}
                    />
                </Box>
            </Box>
        </Card>
    );
}