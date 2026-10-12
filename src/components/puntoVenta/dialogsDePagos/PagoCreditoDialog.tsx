import React, { useState, useEffect } from 'react';
import { useNotify } from '../../notificaciones/useNotify';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    CircularProgress,
    Typography,
    Autocomplete,
    Box
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DialogCrearCliente, { type ClienteFormData } from '../../../components/AddClientDialog';
import { procesarVentaCredito } from '../../../service/ventaService';
import type { ProductoCarrito } from '../../../types/venta.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Tipos ─────────────────────────────────────────────

export interface PagoCreditoData {
    cliente: string;
    id_cliente: string;
    telefono_cliente: string;
    monto_pagar: number;
}

interface ClienteOption {
    id_cliente: string;
    nombre_cliente: string;
    telefono_cliente: string;
    email_cliente: string;
    direccion_cliente: string;
    tipo_cliente: string;
    _id?: string;
}

interface PagoCreditoErrors {
    cliente?: string;
    id_cliente?: string;
    telefono_cliente?: string;
    monto_pagar?: string;
}

export interface PagoCreditoDialogProps {
    open: boolean;
    onClose: () => void;
    montoTotal: number;
    productosCarrito: ProductoCarrito[];
    subtotal: number;
    descuentoTotal: number;
    impuesto: number;
    onPagoCompletado?: (data: PagoCreditoData) => void;
    onVentaExitosa?: (ventaId: string) => void;
}

// ─── Componente ──────────────────────────────────────

export default function PagoCreditoDialog({
    open,
    onClose,
    montoTotal,
    productosCarrito,
    subtotal,
    descuentoTotal,
    impuesto,
    onPagoCompletado,
    onVentaExitosa,
}: PagoCreditoDialogProps): React.JSX.Element {
    const [cliente, setCliente] = useState<string>('');
    const [idCliente, setIdCliente] = useState<string>('');
    const [telefono, setTelefono] = useState<string>('');
    const [montoPagar, setMontoPagar] = useState<string>(montoTotal.toFixed(2));
    const [clienteMongoId, setClienteMongoId] = useState<string>('');

    const [clientes, setClientes] = useState<ClienteOption[]>([]);
    const [loadingClientes, setLoadingClientes] = useState<boolean>(false);
    const [errors, setErrors] = useState<PagoCreditoErrors>({});
    const [loading, setLoading] = useState<boolean>(false);

    const [openDialogCrear, setOpenDialogCrear] = useState<boolean>(false);

    const notify = useNotify();

    useEffect(() => {
        if (open) {
            fetchClientes();
            setMontoPagar(montoTotal.toFixed(2));
        }
    }, [open, montoTotal]);

    const fetchClientes = async (): Promise<void> => {
        setLoadingClientes(true);
        try {
            const response = await fetch(`${API_URL}/cliente`);
            if (!response.ok) throw new Error('Error al cargar clientes');
            const data = await response.json();
            const mappedClientes = data.map((c: any) => ({
                ...c,
                id_cliente: c.id_cliente || c.carnet_identidad || c.ci || '',
                _id: c._id || c.id,
            }));
            setClientes(mappedClientes);
        } catch (error) {
            console.error('Error cargando clientes:', error);
            notify.error('Error al cargar clientes');
        } finally {
            setLoadingClientes(false);
        }
    };

    const handleClienteSeleccionado = (
        _event: React.SyntheticEvent,
        value: ClienteOption | null
    ): void => {
        if (value) {
            setCliente(value.nombre_cliente);
            setIdCliente(value.id_cliente);
            setTelefono(value.telefono_cliente || '');
            setClienteMongoId(value._id || '');
        } else {
            setCliente('');
            setIdCliente('');
            setTelefono('');
            setClienteMongoId('');
        }

        if (errors.cliente) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.cliente;
                return newErrors;
            });
        }
    };

    const handleChange = (
        field: 'id_cliente' | 'telefono_cliente' | 'monto_pagar',
        value: string
    ): void => {
        if (field === 'id_cliente') setIdCliente(value);
        if (field === 'telefono_cliente') setTelefono(value);
        if (field === 'monto_pagar') setMontoPagar(value);

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: PagoCreditoErrors = {};

        if (!cliente.trim()) {
            newErrors.cliente = 'El cliente es requerido';
        }
        if (!idCliente.trim()) {
            newErrors.id_cliente = 'El Carnet de Identidad es requerido';
        }
        if (!telefono.trim()) {
            newErrors.telefono_cliente = 'El teléfono es requerido';
        }
        if (!montoPagar.trim() || isNaN(Number(montoPagar)) || Number(montoPagar) <= 0) {
            newErrors.monto_pagar = 'El monto debe ser mayor a 0';
            notify.warning('Seleccione un producto del Stock');
        }

        if (productosCarrito.length === 0) {
            notify.warning('El carrito está vacío. Agregue productos para continuar.');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && productosCarrito.length > 0;
    };

    // ═══════════════════════════════════════════════════════════════
    // HANDLE FINALIZAR PAGO — CRÉDITO
    // ═══════════════════════════════════════════════════════════════
    const handleFinalizarPago = async (): Promise<void> => {
        if (!validate()) return;

        const montoPagarNum = Number(montoPagar);

        if (!clienteMongoId) {
            notify.error('Error: No se pudo obtener el ID del cliente. Seleccione el cliente nuevamente.');
            return;
        }

        setLoading(true);

        try {
            // ─── PASO 1: Procesar venta completa (Pago Crédito + Venta) ──
            const resultado = await procesarVentaCredito({
                montoPagar: montoPagarNum,
                clienteId: clienteMongoId,
                clienteIdVenta: clienteMongoId,
                productosCarrito: productosCarrito,
                subtotal: subtotal,
                descuentoTotal: descuentoTotal,
                impuesto: impuesto,
            });

            if (!resultado.exito) {
                notify.error(resultado.mensaje);
                setLoading(false);
                return;
            }

            // ─── ÉXITO ────────────────────────────────────────────
            const pagoData: PagoCreditoData = {
                cliente: cliente,
                id_cliente: idCliente,
                telefono_cliente: telefono,
                monto_pagar: montoPagarNum,
            };

            notify.success(`Venta a crédito #${resultado.venta?._id.slice(-6)} procesada exitosamente para ${cliente}`);

            onPagoCompletado?.(pagoData);
            onVentaExitosa?.(resultado.venta!._id);

            setTimeout(() => {
                handleClose();
            }, 1500);

        } catch (error) {
            notify.error(getErrorMessage(error, 'Error al procesar el pago'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        setCliente('');
        setIdCliente('');
        setTelefono('');
        setMontoPagar(montoTotal.toFixed(2));
        setClienteMongoId('');
        setErrors({});
        onClose();
    };

    const handleClienteCreado = (nuevoCliente: ClienteFormData): void => {
        setCliente(nuevoCliente.nombre_cliente);
        setIdCliente(nuevoCliente.id_cliente);
        setTelefono(nuevoCliente.telefono_cliente);
        if ((nuevoCliente as any)._id) {
            setClienteMongoId((nuevoCliente as any)._id);
        }

        setClientes(prev => [...prev, {
            id_cliente: nuevoCliente.id_cliente,
            nombre_cliente: nuevoCliente.nombre_cliente,
            telefono_cliente: nuevoCliente.telefono_cliente,
            email_cliente: nuevoCliente.email_cliente,
            direccion_cliente: nuevoCliente.direccion_cliente,
            tipo_cliente: nuevoCliente.tipo_cliente,
            _id: (nuevoCliente as any)._id || '',
        }]);
    };

    return (
        <>
            <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'primary.main',
                    }}
                >
                    <PaymentIcon sx={{ width: 24, height: 24, color: 'primary.main' }} />
                    Pago por Crédito
                </DialogTitle>

                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
                        <Box sx={{ width: '75%' }}>
                            <Autocomplete
                                options={clientes}
                                getOptionLabel={(option) => option.nombre_cliente}
                                loading={loadingClientes}
                                onChange={handleClienteSeleccionado}
                                value={clientes.find(c => c.nombre_cliente === cliente) || null}
                                renderInput={(params) => (
                                    <TextField {...params} label="Cliente" size="small"
                                        error={!!errors.cliente} helperText={errors.cliente} />
                                )}
                            />
                        </Box>
                        <Button variant="contained" size="small"
                            startIcon={<PersonAddIcon sx={{ fontSize: "medium" }} />}
                            onClick={() => setOpenDialogCrear(true)}
                            sx={{
                                width: '40%',
                                background: "linear-gradient(135deg, rgba(245, 6, 6, 0.9), rgba(10, 83, 218, 0.9))",
                                color: "#fff", textTransform: "none", fontWeight: 600,
                            }}>
                            Nuevo
                        </Button>
                    </Box>

                    <TextField fullWidth label="Nombre del Cliente" margin="normal" size="small"
                        value={cliente}
                        onChange={(e) => {
                            setCliente(e.target.value);
                            if (errors.cliente) {
                                setErrors(prev => { const n = { ...prev }; delete n.cliente; return n; });
                            }
                        }}
                        error={!!errors.cliente} helperText={errors.cliente}
                        disabled={loading}
                    />

                    <TextField fullWidth label="Carnet de Identidad" margin="normal" size="small"
                        value={idCliente}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 11);
                            handleChange("id_cliente", soloNumeros);
                        }}
                        error={!!errors.id_cliente || (idCliente.length > 0 && idCliente.length !== 11)}
                        helperText={
                            errors.id_cliente ||
                            (idCliente.length > 0 && idCliente.length !== 11
                                ? `Debe tener exactamente 11 dígitos (${idCliente.length}/11)`
                                : "Inserte el carnet de identidad")
                        }
                        disabled={loading}
                        slotProps={{
                            input: {
                                inputProps: { maxLength: 11, inputMode: 'numeric', pattern: '[0-9]*' }
                            }
                        }}
                    />

                    <TextField fullWidth label="Teléfono" margin="normal" size="small"
                        value={telefono}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("telefono_cliente", e.target.value)
                        }
                        error={!!errors.telefono_cliente} helperText={errors.telefono_cliente}
                        disabled={loading}
                    />

                    <TextField fullWidth label="Monto a Pagar" margin="normal" size="small"
                        type="number" value={montoPagar}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleChange("monto_pagar", e.target.value)
                        }
                        error={!!errors.monto_pagar} helperText={errors.monto_pagar}
                        disabled={loading}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
                                ),
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ display: "flex", p: 2, ml: 0, gap: 2, width: "100%" }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        fullWidth
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)", color: "white",
                            borderRadius: 2
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFinalizarPago}
                        disabled={
                            loading ||
                            !clienteMongoId ||
                            !montoPagar || Number(montoPagar) <= 0 ||
                            productosCarrito.length === 0
                        }
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 2
                        }}>
                        {loading ? 'Procesando...' : 'Finalizar Pago'}
                    </Button>
                </DialogActions>
            </Dialog>

            <DialogCrearCliente
                open={openDialogCrear}
                onClose={() => setOpenDialogCrear(false)}
                onClienteCreado={handleClienteCreado}
            />

        </>
    );
}