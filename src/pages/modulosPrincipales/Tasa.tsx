import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import EuroIcon from "@mui/icons-material/Euro";
import { useEffect, useState } from "react";
import type { NomencladorValor } from "../../service/nomencladoresApi";
import { nomencladorApi, tasaApi } from "../../service/tasaApi";


export default function Tasa() {
  const [moneda, setMoneda] = useState("");
  const [monedas, setMonedas] = useState<NomencladorValor[]>([]);
  const [loadingMonedas, setLoadingMonedas] = useState(true);

  const [tasaOficial, setTasaOficial] = useState("");
  const [tasaInformal, setTasaInformal] = useState("");
  const [iva, setIva] = useState("");

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  const monedaLabel = (codigo: string) => {
    const monedaEncontrada = monedas.find(
      (item) => item.codigo === codigo,
    );

    if (!monedaEncontrada) {
      return codigo || "Seleccione una moneda";
    }

    return `${monedaEncontrada.codigo} - ${monedaEncontrada.nombre}`;
  };

  const formatNumber = (value: string) => {
    if (!value) return "";

    const numero = Number(value);

    if (Number.isNaN(numero)) {
      return "";
    }

    return new Intl.NumberFormat("es-ES").format(numero);
  };

  const calcularFluctuacion = () => {
    const oficial = parseFloat(
      tasaOficial.replace(/\./g, "").replace(",", "."),
    );

    const informal = parseFloat(
      tasaInformal.replace(/\./g, "").replace(",", "."),
    );

    if (!oficial || !informal || oficial === 0) {
      return 0;
    }

    return ((informal - oficial) / oficial) * 100;
  };

  useEffect(() => {
    const cargarMonedas = async () => {
      setLoadingMonedas(true);

      try {
        const data = await nomencladorApi.getMonedas();

        setMonedas(data);

        if (data.length === 0) {
          setMensaje({
            tipo: "error",
            texto: "No hay monedas activas configuradas en el nomenclador.",
          });
        }
      } catch (error: any) {
        setMensaje({
          tipo: "error",
          texto:
            error?.response?.data?.message ||
            "No se pudo cargar el nomenclador de monedas.",
        });
      } finally {
        setLoadingMonedas(false);
      }
    };

    cargarMonedas();
  }, []);

  useEffect(() => {
    const cargarTasa = async () => {
      if (!moneda) {
        setTasaOficial("");
        setTasaInformal("");
        setIva("");
        return;
      }

      setLoading(true);

      try {
        const tasa = await tasaApi.getByMoneda(moneda);

        if (tasa) {
          setTasaOficial(tasa.tasaBancoCentral.toString());
          setTasaInformal(tasa.tasaMercadoInformal.toString());
          setIva(tasa.iva?.toString() ?? "");
        } else {
          setTasaOficial("");
          setTasaInformal("");
          setIva("");
        }

        setMensaje(null);
      } catch (error: any) {
        setMensaje({
          tipo: "error",
          texto:
            error?.response?.data?.message ||
            "Error al cargar la tasa de la moneda seleccionada.",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarTasa();
  }, [moneda]);

  const limpiar = () => {
    setMoneda("");
    setTasaOficial("");
    setTasaInformal("");
    setIva("");
    setMensaje(null);
  };

  const guardar = async () => {
    if (!moneda) {
      setMensaje({
        tipo: "error",
        texto: "Seleccione una moneda.",
      });
      return;
    }

    const oficial =
      parseFloat(tasaOficial.replace(/\./g, "").replace(",", ".")) || 0;

    const informal =
      parseFloat(tasaInformal.replace(/\./g, "").replace(",", ".")) || 0;

    const ivaNum = iva
      ? parseFloat(iva.replace(/\./g, "").replace(",", ".")) || 0
      : 0;

    setLoading(true);

    try {
      await tasaApi.upsertByMoneda(moneda, {
        tasaBancoCentral: oficial,
        tasaMercadoInformal: informal,
        iva: ivaNum,
        activa: true,
      });

      setMensaje({
        tipo: "success",
        texto: "Tasa actualizada correctamente.",
      });
    } catch (error: any) {
      setMensaje({
        tipo: "error",
        texto:
          error?.response?.data?.message ||
          "No se pudo actualizar la tasa.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fluctuacion = calcularFluctuacion();

  return (
    <Box
      sx={{
        minHeight: "100%",
        width: "100%",
        p: { xs: 2, md: 4 },
        bgcolor: "#0a0f0d",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            color: "#faf7f7",
            fontWeight: 700,
            mb: 0.5,
          }}
        >
          Tasas de Cambio
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#b8b9bb",
          }}
        >
          Módulo de gestión de tasas de cambio de las monedas en tiempo real.
        </Typography>
      </Box>

      <Card
        sx={{
          maxWidth: 760,
          mx: "auto",
          bgcolor: "#111815",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 3,
          boxShadow: "none",
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 3,
            }}
          >
            <CurrencyExchangeIcon sx={{ color: "#00e5a0" }} />

            <Typography
              variant="h6"
              sx={{
                color: "#faf7f7",
                fontWeight: 700,
              }}
            >
              Configuración de Moneda
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <TextField
              select
              fullWidth
              label="Moneda"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              disabled={loadingMonedas || loading}
              slotProps={{
                select: {
                  renderValue: (value) => monedaLabel(value as string),
                },
              }}
            >
              {loadingMonedas && (
                <MenuItem disabled value="">
                  <CircularProgress size={18} sx={{ mr: 1 }} />
                  Cargando monedas...
                </MenuItem>
              )}

              {!loadingMonedas && monedas.length === 0 && (
                <MenuItem disabled value="">
                  No hay monedas activas configuradas
                </MenuItem>
              )}

              {!loadingMonedas &&
                monedas.map((item) => (
                  <MenuItem key={item._id} value={item.codigo}>
                    {item.codigo} - {item.nombre}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              fullWidth
              label="Tasa Banco Central"
              value={formatNumber(tasaOficial)}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setTasaOficial(value);
              }}
              disabled={loading}
              inputMode="numeric"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoneyIcon sx={{ color: "#00e5a0" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              label="Tasa Mercado Informal"
              value={formatNumber(tasaInformal)}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setTasaInformal(value);
              }}
              disabled={loading}
              inputMode="numeric"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EuroIcon sx={{ color: "#00e5a0" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              label="IVA"
              value={formatNumber(iva)}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setIva(value);
              }}
              disabled={loading}
              inputMode="numeric"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">%</InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              fullWidth
              label="Fluctuación"
              value={`${fluctuacion.toFixed(2)} %`}
              disabled
              helperText={
                fluctuacion > 0
                  ? "El mercado informal está por encima"
                  : fluctuacion < 0
                    ? "El mercado informal está por debajo"
                    : "Sin diferencia"
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CurrencyExchangeIcon sx={{ color: "#00e5a0" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiFormHelperText-root": {
                  color:
                    fluctuacion > 0
                      ? "#ff6b6b"
                      : fluctuacion < 0
                        ? "#ffd166"
                        : "#b8b9bb",
                },
              }}
            />
          </Box>

          {mensaje && (
            <Alert
              severity={mensaje.tipo}
              sx={{
                mt: 3,
                borderRadius: 2,
              }}
            >
              {mensaje.texto}
            </Alert>
          )}
        </CardContent>

        <CardActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 3 },
            gap: 2,
          }}
        >
          <Button
            fullWidth
            variant="contained"
            startIcon={<CancelIcon />}
            onClick={limpiar}
            disabled={loading || loadingMonedas}
            sx={{
              flex: 1,
              background:
                "linear-gradient(135deg, #f80000 0%, #ec0163 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#b8b9bb",
              boxShadow: "none",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #f80000 0%, #ec0163 100%)",
                color: "#faf7f7",
                boxShadow: "none",
              },
            }}
          >
            Limpiar campos
          </Button>

          <Button
            fullWidth
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            onClick={guardar}
            disabled={loading || loadingMonedas || !moneda}
            sx={{
              flex: 1,
              bgcolor: "#00e5a0",
              color: "#0a0f0d",
              fontWeight: 700,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#00c98c",
                boxShadow: "none",
              },
            }}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
}