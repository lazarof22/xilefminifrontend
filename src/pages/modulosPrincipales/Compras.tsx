// src/pages/ComprasPage.tsx
import React from 'react';
import {
    Card, CardContent, Typography, Box, Button,
    TextField,
    MenuItem,
    InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CustomDataGrid from "../../components/CustomDataGridR";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import EuroIcon from "@mui/icons-material/Euro";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import DashboardLayout from '../../components/DashboardLayout';

export default function ComprasPage() {
    const [rows, setRows] = React.useState([
        { id: 1, factura: "f002", cliente: "Laptop Acer Predator", fecha: "2024-01-15", moneda: 320, tasaCambio: 360, subtotal: 10, iva: 5, total: 15, estado: "Activo" },
        { id: 2, factura: "f003", cliente: "Laptop Gigabyte Aorus", fecha: "2024-01-16", moneda: 410, tasaCambio: 480, subtotal: 15, iva: 7, estado: "Activo" },
    ]);

    const [moneda, setMoneda] = React.useState("");

    const getFlag = (currency: string) => {
        switch (currency) {
            case "CUP":
                return "https://flagcdn.com/w40/cu.png";
            case "USD":
                return "https://flagcdn.com/w40/us.png";
            case "EUR":
                return "https://flagcdn.com/w40/eu.png";
            default:
                return "";
        }
    };

    const [tasaOficial, setTasaOficial] = React.useState("");
    const [tasaInformal, setTasaInformal] = React.useState("");

    const formatNumber = (value: string) => {
        if (!value) return "";
        return new Intl.NumberFormat("es-ES").format(Number(value));
    };

    const calcularFluctuacion = () => {
        const oficial = parseFloat(tasaOficial);
        const informal = parseFloat(tasaInformal);

        if (!oficial || !informal || oficial === 0) return 0;

        const diferencia = ((informal - oficial) / oficial) * 100;
        return diferencia;
    };

    const [cuentaContable, setCuentaContable] = React.useState("");

    return (
            <Box>
                <Box
                    sx={{
                        width: '100%',
                        height: 60,
                        background:
                            "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        alignContent: 'center',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 2,
                    }}>
                    <Typography variant="h5" sx={{ ml: 2, color:'white' }}>
                        Gestión de Compras
                    </Typography>
                    <Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            sx={{
                                ml: 1,
                                background: "linear-gradient(135deg, rgb(0, 174, 255), rgba(196, 45, 226, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                boxShadow: "none",
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgb(0, 174, 255), rgb(196, 45, 226))",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                                }
                            }}
                        >
                            Nueva Compra
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PictureAsPdfIcon sx={{ fontSize: "medium" }} />}
                            sx={{
                                ml: 1,
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                                color: "#fff",
                                textTransform: "none",
                                fontWeight: 600,
                                boxShadow: "none",
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(255,0,0,1), rgb(196, 45, 226))",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                                }
                            }}
                        >
                            Exportar PDF
                        </Button>
                    </Box>
                </Box>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        <Card sx={{ p: 1 }}>
                            <Typography variant="h6" sx={{ m: 1 }}>
                                Configuración de Moneda y del IVA
                            </Typography>
                            <CardContent>
                                <Card sx={{ p: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 2,
                                        }}
                                    >
                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
                                            <TextField
                                                select
                                                fullWidth
                                                label="Moneda"
                                                value={moneda}
                                                onChange={(e) => setMoneda(e.target.value)}
                                                slotProps={{
                                                    input: {
                                                        startAdornment: moneda && (
                                                            <InputAdornment position="start">
                                                                <img
                                                                    src={getFlag(moneda)}
                                                                    alt="flag"
                                                                    width={24}
                                                                    style={{ borderRadius: 3 }}
                                                                />
                                                            </InputAdornment>
                                                        ),
                                                    }
                                                }}
                                            >
                                                <MenuItem value="CUP">
                                                    <CurrencyExchangeIcon sx={{ mr: 1 }} />
                                                    CUP - Peso Cubano
                                                </MenuItem>

                                                <MenuItem value="USD">
                                                    <AttachMoneyIcon sx={{ mr: 1 }} />
                                                    USD - Dólar Americano
                                                </MenuItem>

                                                <MenuItem value="EUR">
                                                    <EuroIcon sx={{ mr: 1 }} />
                                                    EUR - Euro
                                                </MenuItem>
                                            </TextField>
                                        </Box>

                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
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
                                                helperText={
                                                    tasaOficial
                                                        ? "Tasa oficial registrada correctamente"
                                                        : "Ingrese la tasa oficial"
                                                }
                                            />
                                        </Box>

                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
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
                                                    }
                                                }}
                                                helperText={
                                                    tasaInformal
                                                        ? "Tasa informal registrada"
                                                        : "Ingrese la tasa informal"
                                                }
                                            />
                                        </Box>

                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
                                            <TextField
                                                fullWidth
                                                type="number"
                                                label="Porcentaje IVA"
                                            />
                                        </Box>

                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
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
                                                        ? "El mercado informal está por encima de la tasa oficial"
                                                        : calcularFluctuacion() < 0
                                                            ? "El mercado informal está por debajo de la tasa oficial"
                                                            : "Sin diferencia"
                                                }
                                            />
                                        </Box>
                                    </Box>
                                </Card>
                            </CardContent>
                        </Card>
                        <Card sx={{ p: 1, mt: 2 }}>
                            <Typography variant="h6" sx={{ m: 1 }}>
                                Cuenta Contable
                            </Typography>
                            <CardContent>
                                <Card sx={{ p: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 2,
                                        }}
                                    >
                                        <Box sx={{ flex: { xs: "100%", md: "32%" } }}>
                                            <TextField
                                                select
                                                fullWidth
                                                label="Cuenta Contable"
                                                value={cuentaContable}
                                                onChange={(e) => setCuentaContable(e.target.value)}
                                                helperText={
                                                    cuentaContable
                                                        ? "Cuenta seleccionada correctamente"
                                                        : "Seleccione un tipo de cuenta"
                                                }
                                            >
                                                <MenuItem value="COMPRAS_NACIONALES">
                                                    Compras nacionales
                                                </MenuItem>

                                                <MenuItem value="COMPRAS_IMPORTACION">
                                                    Compras de Importación
                                                </MenuItem>

                                                <MenuItem value="COMPRAS_CONTADO">
                                                    Compras al Contado
                                                </MenuItem>
                                            </TextField>
                                        </Box>
                                    </Box>
                                </Card>
                            </CardContent>
                        </Card>
                        <Box sx={{ mt: 2 }}>
                            <CustomDataGrid
                                title=""
                                rows={rows}
                                getRowId={(row) => row.id}
                                columns={[
                                    { field: "factura", headerName: "Factura" },
                                    { field: "cliente", headerName: "Proveedor" },
                                    { field: "fecha", headerName: "Fecha" },
                                    { field: "moneda", headerName: "Moneda", numeric: true },
                                    { field: "tasaCambio", headerName: "Tasa de Cambio", numeric: true },
                                    { field: "subtotal", headerName: "Subtotal", numeric: true },
                                    { field: "iva", headerName: "IVA", numeric: true },
                                    { field: "total", headerName: "Total", numeric: true },
                                    { field: "estado", headerName: "Estado" },
                                ]}
                            />
                        </Box>
                    </CardContent>
                </Card>
            </Box>
    );
}