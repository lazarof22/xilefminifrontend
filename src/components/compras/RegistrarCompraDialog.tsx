import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';

import { useNotify } from '../notificaciones/useNotify';
import { getErrorMessage } from '../../utils/errorMessage';
import { monedaApi, tasaApi, type MonedaBackend } from '../../service/tasaApi';
import {
    METODOS_PAGO,
    compraApi,
    esMonedaLocal,
    esMypime,
    proveedorApi,
    type MetodoPago,
    type ProveedorBackend,
} from '../../service/compraApi';

// ─── Tipos ─────────────────────────────────────────────

interface FormState {
    numeroFactura: string;
    nombreProveedor: string;
    nombreProducto: string;
    fechaCompra: Dayjs | null;
    moneda: string;
    tasaMercadoInformal: string;
    tasaBancoNacional: string;
    precioCompra: string;
    cantidad: string;
    iva: string;
    metodoPago: MetodoPago | '';
}

export interface RegistrarCompraDialogProps {
    open: boolean;
    onClose: () => void;
    /** Se llama después de guardar la compra en el backend. */
    onGuardada: () => void;
}

const crearFormVacio = (): FormState => ({
    numeroFactura: '',
    nombreProveedor: '',
    nombreProducto: '',
    fechaCompra: dayjs(),
    moneda: '',
    tasaMercadoInformal: '',
    tasaBancoNacional: '',
    precioCompra: '',
    cantidad: '',
    iva: '',
    metodoPago: '',
});

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: '#e8f5f0',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(0,229,160,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#00e5a0' },
    },
};

const aNumero = (valor: string): number => Number(valor.replace(',', '.'));

// ─── Componente ────────────────────────────────────────

export default function RegistrarCompraDialog({
    open,
    onClose,
    onGuardada,
}: RegistrarCompraDialogProps): React.JSX.Element {
    const notify = useNotify();

    const [form, setForm] = useState<FormState>(crearFormVacio);
    const [proveedores, setProveedores] = useState<ProveedorBackend[]>([]);
    const [monedas, setMonedas] = useState<MonedaBackend[]>([]);
    const [listasCargadas, setListasCargadas] = useState(false);
    const cargandoListas = open && !listasCargadas;
    const [guardando, setGuardando] = useState(false);
    const [intentoGuardar, setIntentoGuardar] = useState(false);

    const set = <K extends keyof FormState>(campo: K, valor: FormState[K]): void =>
        setForm((prev) => ({ ...prev, [campo]: valor }));

    // Cambiar proveedor o moneda invalida las tasas escritas: se vacían y se vuelve a sugerir.
    const cambiarContextoTasa = (campo: 'nombreProveedor' | 'moneda', valor: string): void =>
        setForm((prev) => ({
            ...prev,
            [campo]: valor,
            tasaMercadoInformal: '',
            tasaBancoNacional: '',
        }));

    // ── Listas (proveedores y monedas) desde el backend, cada vez que se abre ──
    useEffect(() => {
        if (!open) return;
        let activo = true;
        Promise.all([proveedorApi.getAll(), monedaApi.getAll()])
            .then(([provs, mons]) => {
                if (!activo) return;
                setProveedores(provs);
                setMonedas(mons);
                setListasCargadas(true);
            })
            .catch((error: unknown) => {
                if (activo) {
                    notify.error(
                        getErrorMessage(error, 'No se pudieron cargar los proveedores y monedas'),
                    );
                }
            })
            .finally(() => {
                if (activo) setListasCargadas(true);
            });
        return () => {
            activo = false;
        };
    }, [open, notify]);

    // ── Qué tasa aplica ──
    const proveedor = useMemo(
        () => proveedores.find((p) => p.nombreEmpresa === form.nombreProveedor),
        [proveedores, form.nombreProveedor],
    );
    const monedaLocal = form.moneda === '' || esMonedaLocal(form.moneda);
    const usaInformal = !monedaLocal && !!proveedor && esMypime(proveedor.tipoEmpresa);
    const usaBanco = !monedaLocal && !!proveedor && !esMypime(proveedor.tipoEmpresa);

    // Al cambiar moneda/proveedor se sugiere la tasa vigente de la moneda
    // (el usuario puede corregirla). Las tasas se limpian en los handlers.
    useEffect(() => {
        if (!open) return;
        let activo = true;

        if ((usaInformal || usaBanco) && form.moneda) {
            tasaApi
                .getByMoneda(form.moneda)
                .then((tasa) => {
                    if (!activo || !tasa) return;
                    setForm((prev) => {
                        if (prev.moneda !== form.moneda) return prev;
                        return {
                            ...prev,
                            tasaMercadoInformal:
                                usaInformal && !prev.tasaMercadoInformal
                                    ? String(tasa.tasaMercadoInformal ?? '')
                                    : prev.tasaMercadoInformal,
                            tasaBancoNacional:
                                usaBanco && !prev.tasaBancoNacional
                                    ? String(tasa.tasaBancoCentral ?? '')
                                    : prev.tasaBancoNacional,
                        };
                    });
                })
                .catch(() => {
                    // Sin tasa sugerida: el usuario la escribe a mano.
                });
        }
        return () => {
            activo = false;
        };
    }, [open, form.moneda, form.nombreProveedor, usaInformal, usaBanco]);

    // ── Total = precio × cantidad ──
    const totalPagado = useMemo(() => {
        const total = aNumero(form.precioCompra || '0') * aNumero(form.cantidad || '0');
        return Number.isFinite(total) ? Math.round((total + Number.EPSILON) * 100) / 100 : 0;
    }, [form.precioCompra, form.cantidad]);

    // ── Validación ──
    const errores = useMemo(() => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.numeroFactura.trim()) e.numeroFactura = 'Obligatorio';
        if (!form.nombreProveedor) e.nombreProveedor = 'Seleccione un proveedor';
        if (!form.nombreProducto.trim()) e.nombreProducto = 'Obligatorio';
        if (!form.fechaCompra || !form.fechaCompra.isValid()) e.fechaCompra = 'Fecha no válida';
        if (!form.moneda) e.moneda = 'Seleccione una moneda';
        if (usaInformal && !(aNumero(form.tasaMercadoInformal) > 0)) {
            e.tasaMercadoInformal = 'Indique la tasa';
        }
        if (usaBanco && !(aNumero(form.tasaBancoNacional) > 0)) {
            e.tasaBancoNacional = 'Indique la tasa';
        }
        if (!(aNumero(form.precioCompra) >= 0) || form.precioCompra === '') {
            e.precioCompra = 'Precio no válido';
        }
        const cantidad = aNumero(form.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) e.cantidad = 'Mínimo 1';
        if (!(aNumero(form.iva) >= 0) || form.iva === '') e.iva = 'IVA no válido';
        if (!form.metodoPago) e.metodoPago = 'Seleccione el método de pago';
        return e;
    }, [form, usaInformal, usaBanco]);

    const error = (campo: keyof FormState): string | undefined =>
        intentoGuardar ? errores[campo] : undefined;

    // ── Acciones ──
    const limpiar = (): void => {
        setForm(crearFormVacio());
        setIntentoGuardar(false);
    };

    const handleCancelar = (): void => {
        if (guardando) return;
        limpiar();
        onClose();
    };

    const handleGuardar = async (): Promise<void> => {
        setIntentoGuardar(true);
        if (Object.keys(errores).length > 0) {
            notify.warning('Revise los campos marcados antes de guardar la compra.');
            return;
        }

        setGuardando(true);
        try {
            await compraApi.crear({
                numeroFactura: form.numeroFactura.trim(),
                nombreProveedor: form.nombreProveedor,
                nombreProducto: form.nombreProducto.trim(),
                fechaCompra: form.fechaCompra!.format('YYYY-MM-DD'),
                moneda: form.moneda,
                ...(usaInformal && { tasaMercadoInformal: aNumero(form.tasaMercadoInformal) }),
                ...(usaBanco && { tasaBancoNacional: aNumero(form.tasaBancoNacional) }),
                precioCompra: aNumero(form.precioCompra),
                cantidad: aNumero(form.cantidad),
                iva: aNumero(form.iva),
                metodoPago: form.metodoPago as MetodoPago,
            });
            notify.success('Compra registrada correctamente.');
            limpiar();
            onClose();
            onGuardada();
        } catch (e: unknown) {
            notify.error(getErrorMessage(e, 'No se pudo registrar la compra'));
        } finally {
            setGuardando(false);
        }
    };

    const deshabilitado = guardando;

    return (
        <Dialog
            open={open}
            onClose={handleCancelar}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        bgcolor: '#151a19',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                        borderRadius: 2,
                    },
                },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'linear-gradient(135deg, #0a0f0d 0%, #151a19 100%)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <Typography
                    variant="h6"
                    component="span"
                    sx={{
                        textAlign: 'center',
                        color: '#00e5a0',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <AddShoppingCartIcon sx={{ color: '#00e5a0' }} />
                    Registrar compra
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: '20px !important' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2,
                            mt: 2,
                        }}
                    >
                        <TextField
                            size="small"
                            label="Número de factura"
                            value={form.numeroFactura}
                            onChange={(e) => set('numeroFactura', e.target.value)}
                            disabled={deshabilitado}
                            error={!!error('numeroFactura')}
                            helperText={error('numeroFactura')}
                            sx={inputSx}
                        />

                        <TextField
                            select
                            size="small"
                            label="Nombre del proveedor"
                            value={form.nombreProveedor}
                            onChange={(e) => cambiarContextoTasa('nombreProveedor', e.target.value)}
                            disabled={deshabilitado || cargandoListas}
                            error={!!error('nombreProveedor')}
                            helperText={
                                error('nombreProveedor') ??
                                (cargandoListas
                                    ? 'Cargando proveedores…'
                                    : proveedores.length === 0
                                      ? 'No hay proveedores registrados'
                                      : undefined)
                            }
                            sx={inputSx}
                        >
                            {proveedores.map((p) => (
                                <MenuItem key={p._id} value={p.nombreEmpresa}>
                                    {p.nombreEmpresa}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            size="small"
                            label="Nombre del producto"
                            value={form.nombreProducto}
                            onChange={(e) => set('nombreProducto', e.target.value)}
                            disabled={deshabilitado}
                            error={!!error('nombreProducto')}
                            helperText={error('nombreProducto')}
                            sx={inputSx}
                        />

                        <DatePicker
                            label="Fecha de compra"
                            value={form.fechaCompra}
                            onChange={(valor) => set('fechaCompra', valor)}
                            disabled={deshabilitado}
                            format="DD/MM/YYYY"
                            slotProps={{
                                textField: {
                                    size: 'small',
                                    error: !!error('fechaCompra'),
                                    helperText: error('fechaCompra'),
                                    sx: inputSx,
                                },
                            }}
                        />

                        <TextField
                            select
                            size="small"
                            label="Moneda"
                            value={form.moneda}
                            onChange={(e) => cambiarContextoTasa('moneda', e.target.value)}
                            disabled={deshabilitado || cargandoListas}
                            error={!!error('moneda')}
                            helperText={
                                error('moneda') ??
                                (cargandoListas ? 'Cargando monedas…' : undefined)
                            }
                            sx={inputSx}
                        >
                            {monedas.map((m) => (
                                <MenuItem key={m._id} value={m.tipo_moneda}>
                                    {m.tipo_moneda}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            size="small"
                            label="Método de pago"
                            value={form.metodoPago}
                            onChange={(e) => set('metodoPago', e.target.value as MetodoPago)}
                            disabled={deshabilitado}
                            error={!!error('metodoPago')}
                            helperText={error('metodoPago')}
                            sx={inputSx}
                        >
                            {METODOS_PAGO.map((m) => (
                                <MenuItem key={m.value} value={m.value}>
                                    {m.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            size="small"
                            type="number"
                            label="Tasa de cambio mercado informal"
                            value={form.tasaMercadoInformal}
                            onChange={(e) => set('tasaMercadoInformal', e.target.value)}
                            disabled={deshabilitado || !usaInformal}
                            error={!!error('tasaMercadoInformal')}
                            helperText={
                                error('tasaMercadoInformal') ??
                                (usaInformal ? 'Proveedor Mypime' : 'No aplica')
                            }
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            sx={inputSx}
                        />

                        <TextField
                            size="small"
                            type="number"
                            label="Tasa de cambio del banco nacional"
                            value={form.tasaBancoNacional}
                            onChange={(e) => set('tasaBancoNacional', e.target.value)}
                            disabled={deshabilitado || !usaBanco}
                            error={!!error('tasaBancoNacional')}
                            helperText={
                                error('tasaBancoNacional') ??
                                (usaBanco ? 'Proveedor empresa' : 'No aplica')
                            }
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            sx={inputSx}
                        />

                        <TextField
                            size="small"
                            type="number"
                            label="Precio de compra"
                            value={form.precioCompra}
                            onChange={(e) => set('precioCompra', e.target.value)}
                            disabled={deshabilitado}
                            error={!!error('precioCompra')}
                            helperText={error('precioCompra')}
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            sx={inputSx}
                        />

                        <TextField
                            size="small"
                            type="number"
                            label="Cantidad de productos"
                            value={form.cantidad}
                            onChange={(e) => set('cantidad', e.target.value)}
                            disabled={deshabilitado}
                            error={!!error('cantidad')}
                            helperText={error('cantidad')}
                            slotProps={{ htmlInput: { min: 1, step: 1 } }}
                            sx={inputSx}
                        />

                        <TextField
                            size="small"
                            type="number"
                            label="IVA"
                            value={form.iva}
                            onChange={(e) => set('iva', e.target.value)}
                            disabled={deshabilitado}
                            error={!!error('iva')}
                            helperText={error('iva')}
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            sx={inputSx}
                        />

                        <TextField
                            size="small"
                            label="Total pagado"
                            value={totalPagado.toFixed(2)}
                            helperText="Precio de compra × cantidad"
                            slotProps={{ input: { readOnly: true } }}
                            sx={inputSx}
                        />
                    </Box>
                </LocalizationProvider>
            </DialogContent>

            <DialogActions sx={{ display: 'flex', p: 2, gap: 2, width: '100%' }}>
                <Button
                    onClick={handleCancelar}
                    disabled={guardando}
                    fullWidth
                    variant="contained"
                    startIcon={<CancelIcon />}
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#b8b9bb',
                        boxShadow: 'none',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #f80000 0%, #ec0163 100%)',
                            color: '#faf7f7',
                            boxShadow: 'none',
                        },
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={() => void handleGuardar()}
                    disabled={guardando || cargandoListas}
                    fullWidth
                    startIcon={
                        guardando ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />
                    }
                    sx={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                        color: '#fff',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                    }}
                >
                    {guardando ? 'Guardando…' : 'Guardar compra'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
