
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Grid,
    IconButton,
    InputAdornment,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import CategoryIcon from "@mui/icons-material/Category";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";
import NomencladorDialog from "../../components/nomencladores/nomencladorDialog";
import NomencladorValoresDialog from "../../components/nomencladores/nomencladorValoresDialog";
import { nomencladoresApi, type Nomenclador, type CrearNomencladorDto, } from "../../service/nomencladoresApi";

export default function NomencladoresPage() {
    const [nomencladores, setNomencladores] = useState<
        Nomenclador[]
    >([]);

    const [buscar, setBuscar] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [dialogNomenclador, setDialogNomenclador] =
        useState(false);

    const [nomencladorEditar, setNomencladorEditar] =
        useState<Nomenclador | null>(null);

    const [dialogValores, setDialogValores] = useState(false);
    const [nomencladorSeleccionado, setNomencladorSeleccionado] =
        useState<Nomenclador | null>(null);

    const [notificacion, setNotificacion] = useState({
        open: false,
        mensaje: "",
        severity: "success" as "success" | "error",
    });

    const cargarNomencladores = async () => {
        setLoading(true);
        setError("");

        try {
            const resultado = await nomencladoresApi.listar();
            setNomencladores(resultado);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                "No se pudieron cargar los nomencladores",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarNomencladores();
    }, []);

    const filtrados = useMemo(() => {
        const texto = buscar.toLowerCase().trim();

        if (!texto) return nomencladores;

        return nomencladores.filter(
            (item) =>
                item.nombre.toLowerCase().includes(texto) ||
                item.codigo.toLowerCase().includes(texto) ||
                (item.descripcion ?? "")
                    .toLowerCase()
                    .includes(texto),
        );
    }, [nomencladores, buscar]);

    const total = nomencladores.length;

    const activos = nomencladores.filter(
        (item) => item.activo,
    ).length;

    const inactivos = total - activos;

    const abrirNuevo = () => {
        setNomencladorEditar(null);
        setDialogNomenclador(true);
    };

    const abrirEditar = (item: Nomenclador) => {
        setNomencladorEditar(item);
        setDialogNomenclador(true);
    };

    const abrirValores = (item: Nomenclador) => {
        setNomencladorSeleccionado(item);
        setDialogValores(true);
    };

    const guardarNomenclador = async (
        data: CrearNomencladorDto,
    ) => {
        if (nomencladorEditar?._id) {
            await nomencladoresApi.actualizar(
                nomencladorEditar._id,
                data,
            );
        } else {
            await nomencladoresApi.crear(data);
        }

        await cargarNomencladores();

        setNotificacion({
            open: true,
            mensaje: nomencladorEditar
                ? "Nomenclador actualizado correctamente"
                : "Nomenclador creado correctamente",
            severity: "success",
        });
    };

    const cambiarEstado = async (item: Nomenclador) => {
        try {
            await nomencladoresApi.cambiarEstado(
                item._id,
                !item.activo,
            );

            await cargarNomencladores();

            setNotificacion({
                open: true,
                mensaje: "Estado actualizado correctamente",
                severity: "success",
            });
        } catch (e: any) {
            setNotificacion({
                open: true,
                mensaje:
                    e?.response?.data?.message ||
                    "No se pudo actualizar el estado",
                severity: "error",
            });
        }
    };

    const exportarPDF = () => {
        // Aquí puedes conectar tu generador de PDF existente.
        // Por ahora se utiliza la impresión del navegador.
        window.print();
    };

    return (
        <Box sx={{ width: "100%", pb: 4 }}>
            {/* ENCABEZADO */}
            <Box
                sx={{
                    width: "100%",
                    minHeight: 60,
                    background:
                        "linear-gradient(135deg, rgba(0,114,255,0.9), rgba(142,45,226,0.9)), url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                    px: 2,
                    py: 1.5,
                }}
            >
                <Typography
                    variant="h5"
                    sx={{ ml: 2, color: "white", fontWeight: 600 }}
                >
                    Nomencladores
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                    }}
                >
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={abrirNuevo}
                        sx={{
                            background:
                                "linear-gradient(135deg, rgb(0,174,255), rgba(196,45,226,0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background:
                                    "linear-gradient(135deg, rgb(0,174,255), rgb(196,45,226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            },
                        }}
                    >
                        Nuevo nomenclador
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={exportarPDF}
                        sx={{
                            background:
                                "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196,45,226,0.9))",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "none",
                            "&:hover": {
                                background:
                                    "linear-gradient(135deg, rgba(255,0,0,1), rgb(196,45,226))",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            },
                        }}
                    >
                        Exportar PDF
                    </Button>
                </Box>
            </Box>

            <Box sx={{ p: 3 }}>
                {/* RESUMEN */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4}>
                        <Card>
                            <CardContent>
                                <Stack sx={{
                                    direction: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <Box>
                                        <Typography color="text.secondary">
                                            Total nomencladores
                                        </Typography>
                                        <Typography variant="h4">
                                            {total}
                                        </Typography>
                                    </Box>
                                    <CategoryIcon
                                        sx={{ fontSize: 42, color: "primary.main" }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <Card>
                            <CardContent>
                                <Stack
                                    sx={{
                                        direction: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <Box>
                                        <Typography color="text.secondary">
                                            Activos
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            color="success.main"
                                        >
                                            {activos}
                                        </Typography>
                                    </Box>
                                    <CheckCircleIcon
                                        sx={{
                                            fontSize: 42,
                                            color: "success.main",
                                        }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <Card>
                            <CardContent>
                                <Stack
                                    sx={{
                                        direction: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <Box>
                                        <Typography color="text.secondary">
                                            Inactivos
                                        </Typography>
                                        <Typography
                                            variant="h4"
                                            color="warning.main"
                                        >
                                            {inactivos}
                                        </Typography>
                                    </Box>
                                    <BlockIcon
                                        sx={{
                                            fontSize: 42,
                                            color: "warning.main",
                                        }}
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* TABLA */}
                <Card>
                    <CardContent>
                        <Stack
                            gap={2}
                            sx={{
                                mb: 2,
                                direction: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap"
                            }}
                        >
                            <Box>
                                <Typography variant="h6">
                                    Catálogos del sistema
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Administra los tipos de nomencladores y
                                    sus valores.
                                </Typography>
                            </Box>

                            <TextField
                                size="small"
                                placeholder="Buscar..."
                                value={buscar}
                                onChange={(e) => setBuscar(e.target.value)}
                                sx={{ minWidth: 220 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Stack>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Código</TableCell>
                                        <TableCell>Nombre</TableCell>
                                        <TableCell>Descripción</TableCell>
                                        <TableCell>Orden</TableCell>
                                        <TableCell>Estado</TableCell>
                                        <TableCell align="right">
                                            Acciones
                                        </TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                align="center"
                                            >
                                                <CircularProgress />
                                            </TableCell>
                                        </TableRow>
                                    ) : filtrados.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                align="center"
                                            >
                                                No hay nomencladores para mostrar
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtrados.map((item) => (
                                            <TableRow key={item._id} hover>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: "monospace" }}
                                                    >
                                                        {item.codigo}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    <Typography sx={{ fontWeight: '600' }}>
                                                        {item.nombre}
                                                    </Typography>
                                                </TableCell>

                                                <TableCell>
                                                    {item.descripcion || "—"}
                                                </TableCell>

                                                <TableCell>{item.orden}</TableCell>

                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            item.activo
                                                                ? "Activo"
                                                                : "Inactivo"
                                                        }
                                                        color={
                                                            item.activo
                                                                ? "success"
                                                                : "default"
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Tooltip title="Gestionar valores">
                                                        <IconButton
                                                            color="primary"
                                                            onClick={() =>
                                                                abrirValores(item)
                                                            }
                                                        >
                                                            <ListAltIcon />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            onClick={() =>
                                                                abrirEditar(item)
                                                            }
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip
                                                        title={
                                                            item.activo
                                                                ? "Desactivar"
                                                                : "Activar"
                                                        }
                                                    >
                                                        <IconButton
                                                            color={
                                                                item.activo
                                                                    ? "warning"
                                                                    : "success"
                                                            }
                                                            onClick={() =>
                                                                cambiarEstado(item)
                                                            }
                                                        >
                                                            {item.activo ? (
                                                                <ToggleOnIcon />
                                                            ) : (
                                                                <ToggleOffIcon />
                                                            )}
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>

            {/* DIÁLOGO DE NOMENCLADOR */}
            <NomencladorDialog
                open={dialogNomenclador}
                nomenclador={nomencladorEditar}
                onClose={() => setDialogNomenclador(false)}
                onSave={guardarNomenclador}
            />

            {/* DIÁLOGO DE VALORES */}
            <NomencladorValoresDialog
                open={dialogValores}
                nomenclador={nomencladorSeleccionado}
                onClose={() => setDialogValores(false)}
            />

            <Snackbar
                open={notificacion.open}
                autoHideDuration={3500}
                onClose={() =>
                    setNotificacion((actual) => ({
                        ...actual,
                        open: false,
                    }))
                }
            >
                <Alert
                    severity={notificacion.severity}
                    variant="filled"
                    onClose={() =>
                        setNotificacion((actual) => ({
                            ...actual,
                            open: false,
                        }))
                    }
                >
                    {notificacion.mensaje}
                </Alert>
            </Snackbar>
        </Box>
    );
}