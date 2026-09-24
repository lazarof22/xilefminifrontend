// src/pages/ComprasPage.tsx
import React from 'react';
import {
    Card, CardContent, Typography, Box,
    TextField,
    MenuItem,
} from '@mui/material';
import CustomDataGrid from "../../components/CustomDataGridR";

export default function ComprasPage() {
    const [rows, setRows] = React.useState([
        { id: 1, factura: "f002", cliente: "Laptop Acer Predator", fecha: "2024-01-15", moneda: 320, tasaCambio: 360, subtotal: 10, iva: 5, total: 15, estado: "Activo" },
        { id: 2, factura: "f003", cliente: "Laptop Gigabyte Aorus", fecha: "2024-01-16", moneda: 410, tasaCambio: 480, subtotal: 15, iva: 7, estado: "Activo" },
    ]);

    const [cuentaContable, setCuentaContable] = React.useState("");

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
                        Compras
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de gestión de compras
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ width: '100%', px: 2, pt: 2 }}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
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
        </Box>
    );
}