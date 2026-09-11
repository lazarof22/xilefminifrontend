import { Box, Button, Card, CardActions, CardContent, InputAdornment, MenuItem, TextField, Typography, CircularProgress } from "@mui/material";
import EuroIcon from "@mui/icons-material/Euro";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Tasa() {
    const [moneda, setMoneda] = useState("");
    const [tasaOficial, setTasaOficial] = useState("");
    const [tasaInformal, setTasaInformal] = useState("");
    const [loading, setLoading] = useState<boolean>(false);

    const getFlag = (currency: string) => {
        switch (currency) {
            case "CUP": return "https://flagcdn.com/w40/cu.png";
            case "USD": return "https://flagcdn.com/w40/us.png";
            case "EUR": return "https://flagcdn.com/w40/eu.png";
            case "ZEL": return "https://flagcdn.com/w40/us.png";
            default: return "";
        }
    };

    const monedaLabel = (value: string) => {
        switch (value) {
            case "CUP": return "CUP - Peso Cubano";
            case "USD": return "USD - Dólar Americano";
            case "EUR": return "EUR - Euro";
            case "ZEL": return "ZEL - ZELLE";
            default: return "";
        }
    };

    const formatNumber = (value: string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-ES").format(Number(value));
    };

    const calcularFluctuacion = () => {
        const oficial = parseFloat(tasaOficial);
        const informal = parseFloat(tasaInformal);
        if (!oficial || !informal || oficial === 0) return 0;
        return ((informal - oficial) / oficial) * 100;
    };

    return (
        <Box>
            <Box
                sx={{
                    width: '100%',
                    height: 70,
                    background: "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignContent: 'center',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                }}
            >
                <Box>
                    <Typography variant="h5" sx={{ color: '#f0f0f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        Tasas de Cambio
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de gestion de tasas de cambio de las monedas en tiempo real
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                <Card sx={{ width: '100%', p: 1, mt: 2, }}>
                    <Typography variant="h6" sx={{ m: 1, pl: 1 }}>
                        Configuración de Moneda
                    </Typography>
                    <CardContent>
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 2,
                            }}
                        >
                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Moneda"
                                    value={moneda}
                                    onChange={(e) => setMoneda(e.target.value)}
                                    slotProps={{
                                        select: {
                                            // Controla cómo se ve el valor seleccionado (cerrado)
                                            renderValue: (value) => (
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <img
                                                        src={getFlag(value as string)}
                                                        alt="flag"
                                                        width={24}
                                                        style={{ borderRadius: 3, display: "block" }}
                                                    />
                                                    <Box component="span">
                                                        {monedaLabel(value as string)}
                                                    </Box>
                                                </Box>
                                            ),
                                        },
                                    }}
                                >
                                    <MenuItem value="CUP" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <CurrencyExchangeIcon fontSize="small" />
                                        CUP - Peso Cubano
                                    </MenuItem>
                                    <MenuItem value="USD" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <AttachMoneyIcon fontSize="small" />
                                        USD - Dólar Americano
                                    </MenuItem>
                                    <MenuItem value="EUR" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <EuroIcon fontSize="small" />
                                        EUR - Euro
                                    </MenuItem>
                                    <MenuItem value="ZEL" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <CurrencyExchangeIcon fontSize="small" />
                                        ZEL - ZELLE
                                    </MenuItem>
                                </TextField>
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Tasa del Banco Central"
                                    value={formatNumber(tasaOficial)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        setTasaOficial(value);
                                    }}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start"><CurrencyExchangeIcon sx={{ mr: 1 }} /></InputAdornment>
                                            ),
                                        }
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Tasa del Mercado Informal"
                                    value={formatNumber(tasaInformal)}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "");
                                        setTasaInformal(value);
                                    }}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start"><CurrencyExchangeIcon sx={{ mr: 1 }} /></InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Porcentaje IVA"
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Fluctuación"
                                    value={calcularFluctuacion().toFixed(2)}
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">%</InputAdornment>
                                            ),
                                        }
                                    }}
                                    helperText={
                                        calcularFluctuacion() > 0
                                            ? "El mercado informal está por encima"
                                            : calcularFluctuacion() < 0
                                                ? "El mercado informal está por debajo"
                                                : "Sin diferencia"
                                    }
                                />
                            </Box>
                        </Box>
                    </CardContent>
                    <CardActions sx={{ display: "flex", p: 2, gap: 2, width: "100%" }}>
                        <Button
                            //onClick={handleClose}
                            disabled={loading}
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
                                    bgcolor: 'rgba(239,68,68,0.08)',
                                    boxShadow: 'none',
                                }
                            }}
                        >
                            Limpiar campos
                        </Button>
                        <Button
                            variant="contained"
                            //onClick={handleCreateProduct}
                            //disabled={loading || Object.keys(errors).length > 0}
                            fullWidth
                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                            sx={{
                                flex: 1,
                                bgcolor: '#00e5a0',
                                color: '#0a0f0d',
                                fontWeight: 700,
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: '#00c98c',
                                    boxShadow: 'none',
                                }
                            }}
                        >
                            {loading ? 'Actualizando...' : 'Actualizar'}
                        </Button>
                    </CardActions>
                </Card>
            </Box>

        </Box>
    )
}