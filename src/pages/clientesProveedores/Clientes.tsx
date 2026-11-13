import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DialogCrearCliente from "../../components/AddClientDialog";
import { useEffect, useState } from "react";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CustomDataGrid from "../../components/CustomDataGridR";
import { useNotify } from "../../components/notificaciones/useNotify";
import { getErrorMessage } from "../../utils/errorMessage";
import { CODIGO_PAIS_POR_DEFECTO, etiquetaTipoCliente } from "../../utils/identidadCliente";

// Una fila de la tabla a partir del cliente del servidor.
// `ci` es el documento del cliente: la CI (11 dígitos) o, si se identifica con NIT, el NIT.
const aFila = (c: any) => ({
    id: c._id,
    identificacion: c.tipoIdentidad ?? 'CI',
    ci: c.tipoIdentidad === 'NIT' ? (c.nit ?? c.id_cliente) : c.id_cliente,
    nombre_cliente: c.nombre_cliente,
    telefono_cliente: `${c.codigoPais ?? CODIGO_PAIS_POR_DEFECTO} ${c.telefono_cliente}`,
    email_cliente: c.email_cliente,
    direccion_cliente: c.direccion_cliente,
    tipo_cliente: etiquetaTipoCliente(c.tipo_cliente),
    _original: c
});

export default function ClientesPage() {
    const notify = useNotify();

    // API URL del backend NestJS
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const [openDialog, setOpenDialog] = useState<boolean>(false);

    const handleClienteCreado = (cliente: any) => {
        setRows(prevRows => [aFila(cliente), ...prevRows]);
    };

    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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

            const mappedData = data.map(aFila);

            setRows(mappedData);
        } catch (err: any) {
            notify.error(`Error al cargar los productos: ${getErrorMessage(err)}`);
        } finally {
            setLoading(false);
        }
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
                        Clientes
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                        Módulo de gestión de clientes
                    </Typography>
                </Box>
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
                                    { field: "identificacion", headerName: "Identificación" },
                                    { field: "ci", headerName: "CI / NIT" },
                                    { field: "nombre_cliente", headerName: "Nombre" },
                                    { field: "telefono_cliente", headerName: "Telefono" },
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
                                        notify.success('Producto eliminado exitosamente');
                                    },
                                    onError: (error) => {
                                        notify.error(`Error al eliminar: ${getErrorMessage(error)}`);
                                    },
                                }}
                            />
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}