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
    Divider,
} from "@mui/material";

import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import { LineChart } from "@mui/x-charts/LineChart";
import { useState, useEffect, useMemo } from "react";

import CustomDataGrid from "../../components/CustomDataGridR";

import {
    monedaApi,
    tasaApi,
    monedaCrudApi,
    type MonedaBackend,
    type Tasa as TasaRegistro,
} from "../../service/tasaApi";

type Mensaje = {
    tipo: "success" | "error";
    texto: string;
};

type FilaMoneda = {
    id: string;
    bandera: string;
    identificador: string;
    nombre: string;
};

type FilaHistorial = {
    id: string;
    moneda: string;
    fecha: string;
    bancoCentral: number;
    mercadoInformal: number;
    iva: number;
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

const tablaCardSx = {
    width: "100%",
    borderRadius: 3,
    bgcolor: "#151a19",
    border: "1px solid rgba(255,255,255,0.04)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
    overflow: "hidden",
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

// CUP se excluye del selector y del gráfico.
function filtrarMonedasConTasa(data: MonedaBackend[]): MonedaBackend[] {
    return data.filter(
        (item) => item.tipo_moneda.trim().toUpperCase() !== "CUP",
    );
}

function obtenerFechaRegistro(tasa: TasaRegistro): string | undefined {
    return tasa.fechaActualizacion ?? tasa.createdAt ?? tasa.updatedAt;
}

function fechaComoNumero(tasa: TasaRegistro): number {
    const fecha = obtenerFechaRegistro(tasa);

    if (!fecha) return 0;

    const numero = new Date(fecha).getTime();

    return Number.isFinite(numero) ? numero : 0;
}

function formatearFecha(fecha?: string): string {
    if (!fecha) return "Sin fecha";

    const date = new Date(fecha);

    if (Number.isNaN(date.getTime())) {
        return "Fecha no disponible";
    }

    return date.toLocaleString();
}

function formatearNumero(numero: number | undefined): string {
    if (numero === undefined || !Number.isFinite(Number(numero))) {
        return "—";
    }

    return Number(numero).toLocaleString(undefined, {
        maximumFractionDigits: 6,
    });
}

export default function Tasa() {
    const [moneda, setMoneda] = useState("");

    // Lista sin CUP para el selector y el gráfico.
    const [monedas, setMonedas] = useState<MonedaBackend[]>([]);

    // Lista completa, incluido CUP, para la tabla de monedas.
    const [todasLasMonedas, setTodasLasMonedas] = useState<MonedaBackend[]>([]);

    const [loadingMonedas, setLoadingMonedas] = useState(true);

    const [tasaOficial, setTasaOficial] = useState("");
    const [tasaInformal, setTasaInformal] = useState("");
    const [iva, setIva] = useState("");

    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    const [historial, setHistorial] = useState<TasaRegistro[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const [monedaGrafico, setMonedaGrafico] = useState("");

    const [openMonedaDialog, setOpenMonedaDialog] = useState(false);
    const [nuevoNombreMoneda, setNuevoNombreMoneda] = useState("");
    const [nuevoIdentificador, setNuevoIdentificador] = useState("");
    const [guardandoMoneda, setGuardandoMoneda] = useState(false);
    const [mensajeDialog, setMensajeDialog] = useState<Mensaje | null>(null);

    const getFlag = (currency: string): string => {
        switch (currency.toUpperCase()) {
            case "CUP": return "https://flagcdn.com/w40/cu.png";
            case "USD": return "https://flagcdn.com/w40/us.png";
            case "CAD": return "https://flagcdn.com/w40/ca.png";
            case "MXN": return "https://flagcdn.com/w40/mx.png";
            case "BRL": return "https://flagcdn.com/w40/br.png";
            case "ARS": return "https://flagcdn.com/w40/ar.png";
            case "CLP": return "https://flagcdn.com/w40/cl.png";
            case "COP": return "https://flagcdn.com/w40/co.png";
            case "PEN": return "https://flagcdn.com/w40/pe.png";
            case "DOP": return "https://flagcdn.com/w40/do.png";
            case "EUR": return "https://flagcdn.com/w40/eu.png";
            case "GBP": return "https://flagcdn.com/w40/gb.png";
            case "CHF": return "https://flagcdn.com/w40/ch.png";
            case "SEK": return "https://flagcdn.com/w40/se.png";
            case "NOK": return "https://flagcdn.com/w40/no.png";
            case "DKK": return "https://flagcdn.com/w40/dk.png";
            case "PLN": return "https://flagcdn.com/w40/pl.png";
            case "CZK": return "https://flagcdn.com/w40/cz.png";
            case "RUB": return "https://flagcdn.com/w40/ru.png";
            case "JPY": return "https://flagcdn.com/w40/jp.png";
            case "CNY": return "https://flagcdn.com/w40/cn.png";
            case "KRW": return "https://flagcdn.com/w40/kr.png";
            case "INR": return "https://flagcdn.com/w40/in.png";
            case "AUD": return "https://flagcdn.com/w40/au.png";
            case "NZD": return "https://flagcdn.com/w40/nz.png";
            case "SGD": return "https://flagcdn.com/w40/sg.png";
            case "HKD": return "https://flagcdn.com/w40/hk.png";
            case "THB": return "https://flagcdn.com/w40/th.png";
            case "AED": return "https://flagcdn.com/w40/ae.png";
            case "SAR": return "https://flagcdn.com/w40/sa.png";
            case "QAR": return "https://flagcdn.com/w40/qa.png";
            case "TRY": return "https://flagcdn.com/w40/tr.png";
            case "ILS": return "https://flagcdn.com/w40/il.png";
            case "ZAR": return "https://flagcdn.com/w40/za.png";
            case "EGP": return "https://flagcdn.com/w40/eg.png";
            case "NGN": return "https://flagcdn.com/w40/ng.png";
            case "ZEL": return "https://flagcdn.com/w40/us.png";
            default: return "";
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

    const historialGrafico = useMemo(() => {
        return historial
            .filter(
                (item) =>
                    item.moneda.trim().toUpperCase() ===
                    monedaGrafico.trim().toUpperCase(),
            )
            .sort((a, b) => fechaComoNumero(a) - fechaComoNumero(b));
    }, [historial, monedaGrafico]);

    const etiquetasGrafico = useMemo(() => {
        return historialGrafico.map((item) => {
            const fecha = obtenerFechaRegistro(item);

            if (!fecha) return "Sin fecha";

            const date = new Date(fecha);

            if (Number.isNaN(date.getTime())) return "Sin fecha";

            return date.toLocaleString(undefined, {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });
        });
    }, [historialGrafico]);

    const historialOrdenado = useMemo(() => {
        return [...historial].sort(
            (a, b) => fechaComoNumero(b) - fechaComoNumero(a),
        );
    }, [historial]);

    const monedasOrdenadas = useMemo(() => {
        return [...todasLasMonedas].sort((a, b) =>
            a.tipo_moneda.localeCompare(b.tipo_moneda, "es"),
        );
    }, [todasLasMonedas]);

    // Filas para CustomDataGridR: la columna Bandera muestra la URL
    // como texto porque el componente de tabla representa los valores como texto.
    const filasMonedas = useMemo<FilaMoneda[]>(() => {
        return monedasOrdenadas.map((item) => ({
            id: item._id,
            bandera: item.tipo_moneda.toUpperCase(),
            identificador: item.tipo_moneda.toUpperCase(),
            nombre: item.nombre_moneda || "—",
        }));
    }, [monedasOrdenadas]);

    const columnasMonedas = useMemo(
        () => [
            {
                field: "bandera" as keyof FilaMoneda,
                headerName: "Bandera",
                editable: false,
            },
            {
                field: "identificador" as keyof FilaMoneda,
                headerName: "Identificador",
                editable: false,
            },
            {
                field: "nombre" as keyof FilaMoneda,
                headerName: "Nombre de la moneda",
                editable: false,
            },
        ],
        [],
    );

    const filasHistorial = useMemo<FilaHistorial[]>(() => {
        return historialOrdenado.map((item, index) => ({
            id: String(
                (item as TasaRegistro & { _id?: string })._id ??
                `${item.moneda}-${obtenerFechaRegistro(item) ?? index}`,
            ),
            moneda: item.moneda,
            fecha: formatearFecha(obtenerFechaRegistro(item)),
            bancoCentral: Number(item.tasaBancoCentral ?? 0),
            mercadoInformal: Number(item.tasaMercadoInformal ?? 0),
            iva: Number(item.iva ?? 0),
        }));
    }, [historialOrdenado]);

    const columnasHistorial = useMemo(
        () => [
            {
                field: "moneda" as keyof FilaHistorial,
                headerName: "Moneda",
                editable: false,
            },
            {
                field: "fecha" as keyof FilaHistorial,
                headerName: "Fecha de actualización",
                editable: false,
            },
            {
                field: "bancoCentral" as keyof FilaHistorial,
                headerName: "Banco Central",
                numeric: true,
                editable: false,
            },
            {
                field: "mercadoInformal" as keyof FilaHistorial,
                headerName: "Mercado informal",
                numeric: true,
                editable: false,
            },
            {
                field: "iva" as keyof FilaHistorial,
                headerName: "IVA (%)",
                numeric: true,
                editable: false,
            },
        ],
        [],
    );

    const cargarHistorial = async () => {
        setLoadingHistorial(true);

        try {
            const data = await tasaApi.findAll();

            setHistorial(
                [...data].sort(
                    (a, b) => fechaComoNumero(b) - fechaComoNumero(a),
                ),
            );
        } catch (error: unknown) {
            setMensaje({
                tipo: "error",
                texto: obtenerMensajeError(
                    error,
                    "No se pudo cargar el historial de tasas.",
                ),
            });
        } finally {
            setLoadingHistorial(false);
        }
    };

    useEffect(() => {
        let activo = true;

        const cargarMonedas = async () => {
            setLoadingMonedas(true);

            try {
                const data = await monedaApi.getAll();

                if (!activo) return;

                setTodasLasMonedas(data);

                const monedasFiltradas = filtrarMonedasConTasa(data);

                setMonedas(monedasFiltradas);

                if (monedasFiltradas.length === 0) {
                    setMensaje({
                        tipo: "error",
                        texto: "No hay monedas disponibles para configurar tasas.",
                    });
                } else {
                    setMonedaGrafico((actual) => {
                        if (
                            actual &&
                            monedasFiltradas.some(
                                (item) =>
                                    item.tipo_moneda.toUpperCase() ===
                                    actual.toUpperCase(),
                            )
                        ) {
                            return actual;
                        }

                        return monedasFiltradas[0].tipo_moneda.toUpperCase();
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
                if (activo) setLoadingMonedas(false);
            }
        };

        void cargarMonedas();

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        void cargarHistorial();
    }, []);

    useEffect(() => {
        let activo = true;

        const cargarTasa = async () => {
            setTasaOficial("");
            setTasaInformal("");
            setIva("");

            if (!moneda || moneda.toUpperCase() === "CUP") {
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const tasa = await tasaApi.getByMoneda(moneda);

                if (!activo) return;

                if (tasa) {
                    setTasaOficial(tasa.tasaBancoCentral?.toString() ?? "");
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
                if (activo) setLoading(false);
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

        if (identificador === "CUP") {
            setMensajeDialog({
                tipo: "error",
                texto: "La moneda CUP no puede añadirse a la configuración de tasas.",
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

            setTodasLasMonedas(data);

            const monedasFiltradas = filtrarMonedasConTasa(data);

            setMonedas(monedasFiltradas);

            const nueva = monedasFiltradas.find(
                (item) => item.tipo_moneda.toUpperCase() === identificador,
            );

            if (nueva) {
                setMoneda(nueva.tipo_moneda.toUpperCase());
                setMonedaGrafico(nueva.tipo_moneda.toUpperCase());
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

        if (moneda.trim().toUpperCase() === "CUP") {
            setMensaje({
                tipo: "error",
                texto: "No se pueden configurar tasas para CUP.",
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
                fechaActualizacion: new Date().toISOString(),
            });

            await cargarHistorial();

            setMensaje({
                tipo: "success",
                texto: "Tasa actualizada correctamente y añadida al historial.",
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
        <Box sx={{ width: "100%", pb: 3 }}>
            {/* Cabecera original */}
            <Box
                sx={{
                    width: "100%",
                    minHeight: 70,
                    background:
                        "linear-gradient(135deg, #131817 0%, #043625 100%)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    px: 2,
                    py: 1,
                    boxSizing: "border-box",
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

                    <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                        Módulo de Gestión de Tasas de Cambio
                    </Typography>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<AddCircleOutlinedIcon />}
                    onClick={abrirDialogMoneda}
                    disabled={loading || loadingMonedas || guardandoMoneda}
                >
                    Añadir Moneda
                </Button>
            </Box>

            {/* Formulario y gráfico: diseño original */}
            <Box
                sx={{
                    width: "100%",
                    boxSizing: "border-box",
                    px: 2,
                    pt: 2,
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        lg: "minmax(0, 1fr) minmax(0, 1fr)",
                    },
                    gap: 2,
                    alignItems: "stretch",
                }}
            >
                <Card
                    sx={{
                        width: "100%",
                        p: 1,
                        boxSizing: "border-box",
                    }}
                >
                    <Typography variant="h6" sx={{ m: 1, pl: 1 }}>
                        Configuración de Moneda
                    </Typography>

                    <CardContent>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(2, minmax(0, 1fr))",
                                },
                                gap: 2,
                            }}
                        >
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
                                    loadingMonedas || loading || guardandoMoneda
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

                                {!loadingMonedas && monedas.length === 0 && (
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
                                    htmlInput: { inputMode: "decimal" },
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
                                    htmlInput: { inputMode: "decimal" },
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
                                    htmlInput: { inputMode: "decimal" },
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                %
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Fluctuación"
                                value={fluctuacion.toFixed(2)}
                                sx={{
                                    gridColumn: "1 / -1",
                                    width: "100%",
                                }}
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
                                flexWrap: "wrap",
                                gap: 2,
                                width: "100%",
                            }}
                        >
                            <Button
                                onClick={limpiar}
                                disabled={
                                    loading || loadingMonedas || guardandoMoneda
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

                <Card
                    sx={{
                        width: "100%",
                        minWidth: 0,
                        p: 2,
                        boxSizing: "border-box",
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            mb: 1,
                        }}
                    >
                        <Box>
                            <Typography variant="h6">
                                Evolución de las Tasas
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Historial de cambios por moneda
                            </Typography>
                        </Box>

                        <TextField
                            select
                            size="small"
                            label="Moneda del gráfico"
                            value={monedaGrafico}
                            onChange={(e) =>
                                setMonedaGrafico(e.target.value)
                            }
                            disabled={
                                loadingMonedas || monedas.length === 0
                            }
                            sx={{ minWidth: 180 }}
                        >
                            {monedas.map((item) => {
                                const codigo =
                                    item.tipo_moneda.toUpperCase();

                                return (
                                    <MenuItem
                                        key={item._id}
                                        value={codigo}
                                    >
                                        {monedaLabel(codigo)}
                                    </MenuItem>
                                );
                            })}
                        </TextField>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {loadingHistorial ? (
                        <Box
                            sx={{
                                minHeight: 250,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <CircularProgress />
                        </Box>
                    ) : historialGrafico.length === 0 ? (
                        <Box
                            sx={{
                                minHeight: 250,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                                gap: 1,
                            }}
                        >
                            <Typography color="text.secondary">
                                Todavía no hay historial para{" "}
                                {monedaGrafico || "esta moneda"}.
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                            >
                                Actualiza una tasa para empezar a ver su
                                evolución.
                            </Typography>
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                width: "100%",
                                minWidth: 0,
                                overflowX: "auto",
                            }}
                        >
                            <LineChart
                                height={300}
                                xAxis={[
                                    {
                                        scaleType: "point",
                                        data: etiquetasGrafico,
                                        label: "Fecha de actualización",
                                    },
                                ]}
                                yAxis={[
                                    {
                                        label: "Valor de la tasa",
                                    },
                                ]}
                                series={[
                                    {
                                        data: historialGrafico.map(
                                            (item) =>
                                                Number(
                                                    item.tasaBancoCentral,
                                                ),
                                        ),
                                        label: "Banco Central",
                                        showMark: true,
                                    },
                                    {
                                        data: historialGrafico.map(
                                            (item) =>
                                                Number(
                                                    item.tasaMercadoInformal,
                                                ),
                                        ),
                                        label: "Mercado informal",
                                        showMark: true,
                                    },
                                ]}
                                margin={{
                                    left: 65,
                                    right: 20,
                                    top: 25,
                                    bottom: 65,
                                }}
                            />
                        </Box>
                    )}
                </Card>
            </Box>

            {/* Tabla de monedas registradas: conserva el diseño original */}
            <Box sx={{ px: 2, pt: 2, boxSizing: "border-box" }}>
                <Card sx={tablaCardSx}>
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1,
                            p: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#f0f0f0",
                                    fontWeight: 700,
                                }}
                            >
                                Monedas Registradas
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: "#9ca3af" }}
                            >
                                Todas las monedas registradas en el sistema.
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            startIcon={<AddCircleOutlinedIcon />}
                            onClick={abrirDialogMoneda}
                            disabled={loadingMonedas || guardandoMoneda}
                            sx={{
                                borderColor: "rgba(0,229,160,0.45)",
                                color: "#00e5a0",
                                "&:hover": {
                                    borderColor: "#00e5a0",
                                    bgcolor: "rgba(0,229,160,0.08)",
                                },
                            }}
                        >
                            Añadir Moneda
                        </Button>
                    </Box>

                    {loadingMonedas ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                p: 4,
                            }}
                        >
                            <CircularProgress sx={{ color: "#00e5a0" }} />
                        </Box>
                    ) : monedasOrdenadas.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                No hay monedas registradas.
                            </Typography>
                        </Box>
                    ) : (
                        <CustomDataGrid
                            title="Monedas registradas"
                            rows={filasMonedas}
                            columns={columnasMonedas}
                            getRowId={(row: FilaMoneda) => row.id}
                        />
                    )}
                </Card>
            </Box>

            {/* Tabla de historial: usa la misma tabla que Inventario */}
            <Box sx={{ px: 2, pt: 2, boxSizing: "border-box" }}>
                <Card sx={tablaCardSx}>
                    <Box
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 1,
                            p: 2,
                        }}
                    >
                        <Box>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: "#f0f0f0",
                                    fontWeight: 700,
                                }}
                            >
                                Historial de Tasas
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: "#9ca3af" }}
                            >
                                Registros ordenados por fecha de actualización,
                                del más reciente al más antiguo.
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            onClick={() => void cargarHistorial()}
                            disabled={loadingHistorial}
                            sx={{
                                borderColor: "rgba(0,229,160,0.45)",
                                color: "#00e5a0",
                                "&:hover": {
                                    borderColor: "#00e5a0",
                                    bgcolor: "rgba(0,229,160,0.08)",
                                },
                            }}
                        >
                            {loadingHistorial
                                ? "Actualizando..."
                                : "Recargar historial"}
                        </Button>
                    </Box>

                    {loadingHistorial ? (
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                p: 4,
                            }}
                        >
                            <CircularProgress sx={{ color: "#00e5a0" }} />
                        </Box>
                    ) : historialOrdenado.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: "center" }}>
                            <Typography color="text.secondary">
                                No hay registros históricos de tasas.
                            </Typography>
                        </Box>
                    ) : (
                        <CustomDataGrid
                            title="Historial de tasas"
                            rows={filasHistorial}
                            columns={columnasHistorial}
                            getRowId={(row: FilaHistorial) => row.id}
                        />
                    )}
                </Card>
            </Box>

            {/* Diálogo para añadir monedas: diseño original */}
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
                        <Alert severity={mensajeDialog.tipo} sx={{ mt: 2 }}>
                            {mensajeDialog.texto}
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions sx={{ display: "flex", p: 2, gap: 2 }}>
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
                                <CircularProgress size={16} color="inherit" />
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