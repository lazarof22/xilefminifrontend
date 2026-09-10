import { Alert, Box, Button, Card, CardContent, CircularProgress, Snackbar, Typography } from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DialogCrearCliente, { type ClienteFormData } from "../../components/AddClientDialog";
import { useEffect, useState } from "react";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CustomDataGrid from "../../components/CustomDataGridR";

export default function ClientesPage() {

    // API URL del backend NestJS
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const [openDialog, setOpenDialog] = useState<boolean>(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteFormData | null>(null);

    const handleClienteCreado = (cliente: any) => {
        const nuevoCliente = {
            id: cliente._id,                    // ← _id de MongoDB
            ci: cliente.id_cliente,
            nombre_cliente: cliente.nombre_cliente,
            telefono_cliente: cliente.telefono_cliente,
            email_cliente: cliente.email_cliente,
            direccion_cliente: cliente.direccion_cliente,
            tipo_cliente: cliente.tipo_cliente,
            _original: cliente
        };

        setRows(prevRows => [nuevoCliente, ...prevRows]);

    };

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Snackbar
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/cliente`);
            if (!response.ok) throw new Error('Error al cargar productos');
            const result = await response.json();

            const data = Array.isArray(result) ? result : result.data || [];

            const mappedData = data.map((c: any) => ({
                id: c._id,
                ci: c.id_cliente,
                nombre_cliente: c.nombre_cliente,
                telefono_cliente: c.telefono_cliente,
                email_cliente: c.email_cliente,
                direccion_cliente: c.direccion_cliente,
                tipo_cliente: c.tipo_cliente,
                _original: c
            }));

            setRows(mappedData);
        } catch (err: any) {
            setSnackbarMessage('Error al cargar los productos: ' + err.message);
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

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
                <Typography variant="h5" sx={{ ml: 2, color: 'white' }}>
                    Clientes
                </Typography>
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<PersonAddIcon sx={{ fontSize: "medium" }} />}
                        onClick={() => setOpenDialog(true)}
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
                        Nuevo Cliente
                    </Button>
                    <DialogCrearCliente
                        open={openDialog}
                        onClose={() => setOpenDialog(false)}
                        onClienteCreado={handleClienteCreado}
                    />
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
            <Box sx={{ m: 2 }}>
                <Card sx={{ width: '100%' }}>
                    <CardContent>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <CustomDataGrid
                                title="Clientes"
                                rows={rows}
                                getRowId={(row) => row.id}
                                columns={[
                                    { field: "ci", headerName: "CI" },
                                    { field: "nombre_cliente", headerName: "Nombre" },
                                    { field: "telefono_cliente", headerName: "Telefono", numeric: true },
                                    { field: "email_cliente", headerName: "Email" },
                                    { field: "direccion_cliente", headerName: "Direccion" },
                                    { field: "tipo_cliente", headerName: "Tipo de Cliente" },
                                ]}
                                deleteConfig={{
                                    baseUrl: `${API_URL}/cliente`,  // ← Tu endpoint DELETE
                                    // getId es opcional, por defecto usa getRowId
                                    // getId: (row) => row.id,
                                    onSuccess: () => {
                                        // Recargar la lista después de eliminar
                                        fetchClientes();
                                        setSnackbarMessage('Producto eliminado exitosamente');
                                        setSnackbarSeverity('success');
                                        setOpenSnackbar(true);
                                    },
                                    onError: (error) => {
                                        setSnackbarMessage('Error al eliminar: ' + error.message);
                                        setSnackbarSeverity('error');
                                        setOpenSnackbar(true);
                                    },
                                }}
                            />
                        )}
                    </CardContent>
                </Card>
                {/* Snackbar */}
                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={3000}
                    onClose={() => setOpenSnackbar(false)}
                >
                    <Alert
                        severity={snackbarSeverity}
                        variant="filled"
                        onClose={() => setOpenSnackbar(false)}
                    >
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </Box>
    );
}