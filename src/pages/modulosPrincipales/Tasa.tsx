import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    InputAdornment,
    MenuItem,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";

import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import { useState, useEffect } from "react";

import {
    monedaApi,
    tasaApi,
    monedaCrudApi,
    type MonedaBackend,
} from "../../service/tasaApi";

type Mensaje = {
    tipo: "success" | "error";
    texto: string;
};

const botonCancelarSx = {
    flex: 1,
    background: "linear-gradient(135deg, #f80000 0%, #ec0163 100%)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#faf7f7",
    boxShadow: "none",
    "&:hover": {
        background: "linear-gradient(135deg, #f80000 0%, #ec0163 100%)",
        boxShadow: "none",
    },
};

const botonGuardarSx = {
    flex: 1,
    bgcolor: "#00e5a0",
    color: "#0a0f0d",
    fontWeight: 700,
    boxShadow: "none",
    "&:hover": {
        bgcolor: "#00c98c",
        boxShadow: "none",
    },
};

function obtenerMensajeError(error: unknown, fallback: string): string {
    if (typeof error !== "object" || error === null) {
        return fallback;
    }

    const response = (
        error as {
            response?: {
                data?: {
                    message?: unknown;
                };
            };
        }
    ).response;

    const message = response?.data?.message;

    if (typeof message === "string") {
        return message;
    }

    if (Array.isArray(message)) {
        const mensajes = message.filter(
            (item): item is string => typeof item === "string",
        );

        return mensajes.length > 0 ? mensajes.join(". ") : fallback;
    }

    return fallback;
}

// Guarda números sin separadores de miles.
// Permite escribir decimales con punto o coma.
function normalizarEntradaNumerica(value: string): string {
    const limpio = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
    const [entero, ...decimales] = limpio.split(".");

    if (decimales.length === 0) {
        return entero;
    }

    return `${entero}.${decimales.join("")}`;
}

function convertirNumero(value: string): number {
    if (!value.trim()) {
        return Number.NaN;
    }

    return Number(value);
}

export default function Tasa() {
    const [moneda, setMoneda] = useState("");
    const [monedas, setMonedas] = useState<MonedaBackend[]>([]);
    const [loadingMonedas, setLoadingMonedas] = useState(true);

    const [tasaOficial, setTasaOficial] = useState("");
    const [tasaInformal, setTasaInformal] = useState("");
    const [iva, setIva] = useState("");

    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const [openMonedaDialog, setOpenMonedaDialog] = useState(false);
    const [nuevoNombreMoneda, setNuevoNombreMoneda] = useState("");
    const [nuevoIdentificador, setNuevoIdentificador] = useState("");
    const [guardandoMoneda, setGuardandoMoneda] = useState(false);
    const [mensajeDialog, setMensajeDialog] = useState<Mensaje | null>(null);

    const getFlag = (currency: string): string => {
        switch (currency.toUpperCase()) {
            case "CUP":
                return "https://flagcdn.com/w40/cu.png";
            case "USD":
                return "https://flagcdn.com/w40/us.png";
            case "EUR":
                return "https://flagcdn.com/w40/eu.png";
            case "ZEL":
                return "https://flagcdn.com/w40/us.png";
            default:
                return "";
        }
    };

    const monedaLabel = (value: string): string => {
        const codigo = value.toUpperCase();

        const seleccionada = monedas.find(
            (item) => item.tipo_moneda.toUpperCase() === codigo,
        );

        return seleccionada?.nombre_moneda
            ? `${codigo} - ${seleccionada.nombre_moneda}`
            : codigo;
    };

    const oficial = convertirNumero(tasaOficial);
    const informal = convertirNumero(tasaInformal);

    const fluctuacion =
        Number.isFinite(oficial) &&
            Number.isFinite(informal) &&
            oficial > 0
            ? ((informal - oficial) / oficial) * 100
            : 0;

    useEffect(() => {
        let activo = true;

        const cargarMonedas = async () => {
            setLoadingMonedas(true);

            try {
                const data = await monedaApi.getAll();

                if (!activo) return;

                setMonedas(data);

                if (data.length === 0) {
                    setMensaje({
                        tipo: "error",
                        texto: "No hay monedas registradas.",
                    });
                }
            } catch (error: unknown) {
                if (!activo) return;

                setMensaje({
                    tipo: "error",
                    texto: obtenerMensajeError(
                        error,
                        "No se pudieron cargar las monedas.",
                    ),
                });
            } finally {
                if (activo) {
                    setLoadingMonedas(false);
                }
            }
        };

        void cargarMonedas();

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        let activo = true;

        const cargarTasa = async () => {
            setTasaOficial("");
            setTasaInformal("");
            setIva("");

            if (!moneda) {
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const tasa = await tasaApi.getByMoneda(moneda);

                if (!activo) return;

                if (tasa) {
                    setTasaOficial(
                        tasa.tasaBancoCentral?.toString() ?? "",
                    );
                    setTasaInformal(
                        tasa.tasaMercadoInformal?.toString() ?? "",
                    );
                    setIva(tasa.iva?.toString() ?? "");
                }
            } catch (error: unknown) {
                if (!activo) return;

                setMensaje({
                    tipo: "error",
                    texto: obtenerMensajeError(
                        error,
                        "Error al cargar la tasa de la moneda seleccionada.",
                    ),
                });
            } finally {
                if (activo) {
                    setLoading(false);
                }
            }
        };

        void cargarTasa();

        return () => {
            activo = false;
        };
    }, [moneda]);

    const limpiar = () => {
        setMoneda("");
        setTasaOficial("");
        setTasaInformal("");
        setIva("");
        setMensaje(null);
    };

    const abrirDialogMoneda = () => {
        setNuevoNombreMoneda("");
        setNuevoIdentificador("");
        setMensajeDialog(null);
        setOpenMonedaDialog(true);
    };

    const cerrarDialogMoneda = () => {
        if (guardandoMoneda) return;

        setOpenMonedaDialog(false);
        setMensajeDialog(null);
    };

    const guardarMoneda = async () => {
        const nombre = nuevoNombreMoneda.trim();
        const identificador = nuevoIdentificador.trim().toUpperCase();

        if (!nombre || !identificador) {
            setMensajeDialog({
                tipo: "error",
                texto: "Complete Nombre e Identificador de la moneda.",
            });
            return;
        }

        setGuardandoMoneda(true);
        setMensajeDialog(null);

        try {
            await monedaCrudApi.create({
                tipo_moneda: identificador,
                nombre_moneda: nombre,
            });
        } catch (error: unknown) {
            setMensajeDialog({
                tipo: "error",
                texto: obtenerMensajeError(
                    error,
                    "No se pudo añadir la moneda.",
                ),
            });

            setGuardandoMoneda(false);
            return;
        }

        setOpenMonedaDialog(false);
        setNuevoNombreMoneda("");
        setNuevoIdentificador("");

        setMensaje({
            tipo: "success",
            texto: "Moneda añadida correctamente.",
        });

        setLoadingMonedas(true);

        try {
            const data = await monedaApi.getAll();
            setMonedas(data);

            const nueva = data.find(
                (item) =>
                    item.tipo_moneda.toUpperCase() === identificador,
            );

            if (nueva) {
                setMoneda(nueva.tipo_moneda.toUpperCase());
            }
        } catch (error: unknown) {
            setMensaje({
                tipo: "error",
                texto: obtenerMensajeError(
                    error,
                    "La moneda se creó, pero no se pudo actualizar la lista.",
                ),
            });
        } finally {
            setLoadingMonedas(false);
            setGuardandoMoneda(false);
        }
    };

    const guardar = async () => {
        if (!moneda) {
            setMensaje({
                tipo: "error",
                texto: "Seleccione una moneda.",
            });
            return;
        }

        const oficialNum = convertirNumero(tasaOficial);
        const informalNum = convertirNumero(tasaInformal);
        const ivaNum = iva.trim() ? convertirNumero(iva) : 0;

        if (
            !Number.isFinite(oficialNum) ||
            !Number.isFinite(informalNum) ||
            !Number.isFinite(ivaNum) ||
            oficialNum < 0 ||
            informalNum < 0 ||
            ivaNum < 0
        ) {
            setMensaje({
                tipo: "error",
                texto:
                    "Complete ambas tasas con números válidos. " +
                    "Las tasas y el IVA no pueden ser negativos.",
            });
            return;
        }

        setLoading(true);
        setMensaje(null);

        try {
            await tasaApi.upsertByMoneda(moneda, {
                tasaBancoCentral: oficialNum,
                tasaMercadoInformal: informalNum,
                iva: ivaNum,
                activa: true,
            });

            setMensaje({
                tipo: "success",
                texto: "Tasa actualizada correctamente.",
            });
        } catch (error: unknown) {
            setMensaje({
                tipo: "error",
                texto: obtenerMensajeError(
                    error,
                    "No se pudo actualizar la tasa.",
                ),
            });
        } finally {
            setLoading(false);
        }
    };

    const camposDeshabilitados =
        loading || loadingMonedas || guardandoMoneda || !moneda;

    return (

        <Box sx={{ width: "100%" }}>
            {/* Cabecera */}
            <Box
                sx={{
                    width: "100%",
                    height: 70,
                    background:
                        "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    alignContent: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    px: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h5"
                        sx={{
                            color: "#f0f0f0",
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Tasas de Cambio
                    </Typography>

                    <Typography
                        variant="caption"
                        sx={{ color: "#9ca3af" }}
                    >
                        Módulo de Gestión de Tasas de Cambio
                    </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddCircleOutlinedIcon />}
                            onClick={abrirDialogMoneda}
                            disabled={loading || loadingMonedas || guardandoMoneda}
                        >
                            Añadir Moneda
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* Configuración de tasas */}
            <Box
                sx={{
                    width: "100%",
                    boxSizing: "border-box",
                    px: 2,
                    pt: 2,
                }}
            >
                <Card sx={{ width: "100%", p: 1, mt: 2 }}>
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
                                    onChange={(e) => {
                                        setMensaje(null);
                                        setMoneda(e.target.value);
                                    }}
                                    disabled={
                                        loadingMonedas ||
                                        loading ||
                                        guardandoMoneda
                                    }
                                    slotProps={{
                                        select: {
                                            renderValue: (value) => {
                                                const codigo = String(value);
                                                const bandera = getFlag(codigo);

                                                return (
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        {bandera && (
                                                            <Box
                                                                component="img"
                                                                src={bandera}
                                                                alt={`Bandera de ${codigo}`}
                                                                sx={{
                                                                    width: 24,
                                                                    borderRadius: "3px",
                                                                    display: "block",
                                                                }}
                                                            />
                                                        )}

                                                        <Box component="span">
                                                            {monedaLabel(codigo)}
                                                        </Box>
                                                    </Box>
                                                );
                                            },
                                        },
                                    }}
                                >
                                    {loadingMonedas && (
                                        <MenuItem disabled value="">
                                            <CircularProgress
                                                size={18}
                                                sx={{ mr: 1 }}
                                            />
                                            Cargando monedas...
                                        </MenuItem>
                                    )}

                                    {!loadingMonedas &&
                                        monedas.length === 0 && (
                                            <MenuItem disabled value="">
                                                No hay monedas registradas
                                            </MenuItem>
                                        )}

                                    {!loadingMonedas &&
                                        monedas.map((item) => {
                                            const codigo =
                                                item.tipo_moneda.toUpperCase();

                                            const bandera = getFlag(codigo);

                                            return (
                                                <MenuItem
                                                    key={item._id}
                                                    value={codigo}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        {bandera && (
                                                            <Box
                                                                component="img"
                                                                src={bandera}
                                                                alt={`Bandera de ${codigo}`}
                                                                sx={{
                                                                    width: 24,
                                                                    borderRadius: "3px",
                                                                    display: "block",
                                                                }}
                                                            />
                                                        )}

                                                        {monedaLabel(codigo)}
                                                    </Box>
                                                </MenuItem>
                                            );
                                        })}
                                </TextField>
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Tasa del Banco Central"
                                    value={tasaOficial}
                                    onChange={(e) =>
                                        setTasaOficial(
                                            normalizarEntradaNumerica(
                                                e.target.value,
                                            ),
                                        )
                                    }
                                    disabled={camposDeshabilitados}
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: "decimal",
                                        },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <CurrencyExchangeIcon
                                                        sx={{ mr: 1 }}
                                                    />
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Tasa del Mercado Informal"
                                    value={tasaInformal}
                                    onChange={(e) =>
                                        setTasaInformal(
                                            normalizarEntradaNumerica(
                                                e.target.value,
                                            ),
                                        )
                                    }
                                    disabled={camposDeshabilitados}
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: "decimal",
                                        },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <CurrencyExchangeIcon
                                                        sx={{ mr: 1 }}
                                                    />
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Porcentaje IVA"
                                    value={iva}
                                    onChange={(e) =>
                                        setIva(
                                            normalizarEntradaNumerica(
                                                e.target.value,
                                            ),
                                        )
                                    }
                                    disabled={camposDeshabilitados}
                                    slotProps={{
                                        htmlInput: {
                                            inputMode: "decimal",
                                        },
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    %
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                />
                            </Box>

                            <Box sx={{ flex: { xs: "100%", md: "23%" } }}>
                                <TextField
                                    fullWidth
                                    label="Fluctuación"
                                    value={fluctuacion.toFixed(2)}
                                    slotProps={{
                                        input: {
                                            readOnly: true,
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    %
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    helperText={
                                        fluctuacion > 0
                                            ? "El mercado informal está por encima"
                                            : fluctuacion < 0
                                                ? "El mercado informal está por debajo"
                                                : "Sin diferencia"
                                    }
                                />
                            </Box>
                        </Box>
                    </CardContent>

                    <CardActions
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            p: 2,
                            gap: 2,
                        }}
                    >
                        {mensaje && (
                            <Alert
                                severity={mensaje.tipo}
                                sx={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                }}
                            >
                                {mensaje.texto}
                            </Alert>
                        )}

                        <Box
                            sx={{
                                display: "flex",
                                gap: 2,
                                width: "100%",
                            }}
                        >
                            <Button
                                onClick={limpiar}
                                disabled={
                                    loading ||
                                    loadingMonedas ||
                                    guardandoMoneda
                                }
                                fullWidth
                                variant="contained"
                                startIcon={<CancelIcon />}
                                sx={botonCancelarSx}
                            >
                                Limpiar campos
                            </Button>

                            <Button
                                variant="contained"
                                onClick={guardar}
                                disabled={camposDeshabilitados}
                                fullWidth
                                startIcon={
                                    loading ? (
                                        <CircularProgress
                                            size={16}
                                            color="inherit"
                                        />
                                    ) : (
                                        <CheckCircleIcon />
                                    )
                                }
                                sx={botonGuardarSx}
                            >
                                {loading ? "Procesando..." : "Actualizar"}
                            </Button>
                        </Box>
                    </CardActions>
                </Card>
            </Box>

            {/* Diálogo para añadir monedas */}
            <Dialog
                open={openMonedaDialog}
                onClose={cerrarDialogMoneda}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Añadir Moneda</DialogTitle>

                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Nombre de la moneda"
                        margin="normal"
                        value={nuevoNombreMoneda}
                        onChange={(e) => {
                            setNuevoNombreMoneda(e.target.value);
                            setMensajeDialog(null);
                        }}
                        disabled={guardandoMoneda}
                        placeholder="Ejemplo: EURO"
                    />

                    <TextField
                        fullWidth
                        label="Identificador de la moneda"
                        margin="normal"
                        value={nuevoIdentificador}
                        onChange={(e) => {
                            setNuevoIdentificador(
                                e.target.value.toUpperCase(),
                            );
                            setMensajeDialog(null);
                        }}
                        disabled={guardandoMoneda}
                        placeholder="Ejemplo: EUR"
                    />

                    {mensajeDialog && (
                        <Alert
                            severity={mensajeDialog.tipo}
                            sx={{ mt: 2 }}
                        >
                            {mensajeDialog.texto}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{
                        display: "flex",
                        p: 2,
                        gap: 2,
                    }}
                >
                    <Button
                        onClick={cerrarDialogMoneda}
                        disabled={guardandoMoneda}
                        fullWidth
                        variant="contained"
                        startIcon={<CancelIcon />}
                        sx={botonCancelarSx}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={guardarMoneda}
                        disabled={
                            guardandoMoneda ||
                            !nuevoNombreMoneda.trim() ||
                            !nuevoIdentificador.trim()
                        }
                        fullWidth
                        startIcon={
                            guardandoMoneda ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : (
                                <CheckCircleIcon />
                            )
                        }
                        sx={botonGuardarSx}
                    >
                        {guardandoMoneda ? "Guardando..." : "Guardar"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}