import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Box,
    Stack,
    Divider,
    IconButton,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { MonedaCobro } from '../types/venta.types';
import { simboloMoneda, totalDeDesglose, type DesgloseDenominaciones } from '../utils/divisasVenta';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

/** Billetes y monedas contados: valor de la denominación ("100") → cantidad. */
export type DesgloseData = DesgloseDenominaciones;

interface DesgloseEfectivoDialogProps {
    open: boolean;
    onClose: () => void;
    /** Moneda del desglose, con los billetes y monedas que acepta (los informa el servidor). */
    moneda: MonedaCobro;
    /** Lo que hay que cobrar, expresado en esa moneda. */
    montoAPagar: number;
    onAceptar: (desglose: DesgloseData, totalDesglose: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════

export default function DesgloseEfectivoDialog({
    open,
    onClose,
    moneda,
    montoAPagar,
    onAceptar,
}: DesgloseEfectivoDialogProps): React.JSX.Element {
    const [desglose, setDesglose] = useState<DesgloseData>({});

    // Las denominaciones salen del nomenclador del servidor: USD y EUR hasta 100, CUP hasta 5000.
    const denominaciones = moneda.denominaciones;
    // Cambia solo si cambian los billetes de la moneda (no cada vez que se vuelven a leer del servidor).
    const claveBilletes = denominaciones.join('|');

    // Inicializar desglose en 0 al abrir
    useEffect(() => {
        if (open) {
            const initial: DesgloseData = {};
            claveBilletes.split('|').forEach((clave) => { initial[clave] = 0; });
            // eslint-disable-next-line react-hooks/set-state-in-effect -- el desglose se reinicia al abrir el diálogo
            setDesglose(initial);
        }
    }, [open, claveBilletes]);

    const handleChange = (clave: string, value: number): void => {
        setDesglose(prev => ({ ...prev, [clave]: Math.max(0, value) }));
    };

    // Suma total en tiempo real
    const totalDesglose = useMemo(() => totalDeDesglose(desglose), [desglose]);

    const handleAceptar = (): void => {
        onAceptar(desglose, totalDesglose);
        onClose();
    };

    const simbolo = simboloMoneda(moneda.codigo);
    // En céntimos: 2.30 − 2.29 no debe dar un faltante de 0.0000001.
    const diferencia = (Math.round(totalDesglose * 100) - Math.round(montoAPagar * 100)) / 100;
    const estaCuadrado = diferencia >= 0;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        overflow: 'hidden'
                    }
                }
            }}
        >
            {/* ─── Header ─── */}
            <DialogTitle sx={{
                background: 'linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
            }}>
                <Typography component="span" variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                    💵 Desglose de Efectivo — {moneda.codigo}
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
                {/* ─── Monto a pagar ─── */}
                <Box sx={{
                    mb: 2.5,
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(0,114,255,0.08), rgba(142,45,226,0.08))',
                    border: '1px solid rgba(0,114,255,0.15)',
                    textAlign: 'center'
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Monto a Pagar
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                        {simbolo}{montoAPagar.toFixed(2)}
                    </Typography>
                </Box>

                {/* ─── Lista de billetes ─── */}
                <Stack spacing={2}>
                    {denominaciones.map((valor) => {
                        const clave = String(valor);
                        const cantidad = desglose[clave] || 0;
                        return (
                            <Box key={clave} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{
                                    flex: 1,
                                    fontWeight: 600,
                                    color: 'text.primary',
                                    fontSize: '0.95rem'
                                }}>
                                    Billetes de {simbolo}{valor}
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {/* Botón menos */}
                                    <Button
                                        size="small"
                                        onClick={() => handleChange(clave, cantidad - 1)}
                                        sx={{
                                            minWidth: 32,
                                            height: 32,
                                            p: 0,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255, 174, 0, 0.78)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                        }}
                                    >
                                        <RemoveIcon sx={{ fontSize: 16 }} />
                                    </Button>

                                    {/* Input cantidad */}
                                    <TextField
                                        size="small"
                                        type="number"
                                        value={cantidad}
                                        onChange={(e) => handleChange(clave, parseInt(e.target.value) || 0)}
                                        slotProps={{
                                            htmlInput: {
                                                min: 0,
                                                style: { textAlign: 'center', width: 60 }
                                            }
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 1,
                                                bgcolor: 'action.hover',
                                            }
                                        }}
                                    />

                                    {/* Botón más */}
                                    <Button
                                        size="small"
                                        onClick={() => handleChange(clave, cantidad + 1)}
                                        sx={{
                                            minWidth: 32,
                                            height: 32,
                                            p: 0,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(255, 174, 0, 0.78)',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'rgb(255, 166, 0)' }
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 16 }} />
                                    </Button>
                                </Box>

                                {/* Subtotal de la línea */}
                                <Typography sx={{
                                    minWidth: 90,
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    fontSize: '0.9rem'
                                }}>
                                    = {simbolo}{(cantidad * valor).toFixed(2)}
                                </Typography>
                            </Box>
                        );
                    })}
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                {/* ─── Totales ─── */}
                <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                        Total Desglose:{" "}
                        <Box component="strong" sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                            {simbolo}{totalDesglose.toFixed(2)}
                        </Box>
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            fontWeight: 700,
                            color: diferencia >= 0 ? 'success.main' : 'error.main',
                        }}
                    >
                        {diferencia >= 0
                            ? `✓ Cuadrado (Sobrante: ${simbolo}${diferencia.toFixed(2)})`
                            : `✗ Faltan: ${simbolo}${Math.abs(diferencia).toFixed(2)}`
                        }
                    </Typography>
                </Box>
            </DialogContent>

            {/* ─── Acciones ─── */}
            <DialogActions sx={{ p: 2.5, gap: 2 }}>
                <Button
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: 'text.secondary',
                        borderRadius: 2,
                        px: 3
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleAceptar}
                    disabled={!estaCuadrado}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                        color: "#fff",
                        borderRadius: 2,
                        boxShadow: "0 4px 12px rgba(10, 83, 218, 0.3)",
                        '&:hover': {
                            boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                        },
                        '&:disabled': {
                            background: (theme: Theme) => theme.palette.action.disabledBackground,
                            color: (theme: Theme) => theme.palette.action.disabled,
                            boxShadow: 'none'
                        }
                    }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
}