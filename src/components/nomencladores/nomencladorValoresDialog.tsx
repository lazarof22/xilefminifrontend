
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import CloseIcon from "@mui/icons-material/Close";

import type {Nomenclador,NomencladorValor,} from "../../service/nomencladoresApi";
import { nomencladoresApi } from "../../service/nomencladoresApi";
import ValorNomencladorDialog from "../nomencladores/valorNomenclador";

interface Props {
  open: boolean;
  nomenclador: Nomenclador | null;
  onClose: () => void;
}

export default function NomencladorValoresDialog({
  open,
  nomenclador,
  onClose,
}: Props) {
  const [valores, setValores] = useState<
    NomencladorValor[]
  >([]);

  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [dialogValor, setDialogValor] = useState(false);
  const [valorEditar, setValorEditar] =
    useState<NomencladorValor | null>(null);

  const cargarValores = async () => {
    if (!nomenclador) return;

    setLoading(true);
    setError("");

    try {
      const resultado =
        await nomencladoresApi.listarValores(
          nomenclador.codigo,
          true,
        );

      setValores(resultado);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "No se pudieron cargar los valores",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && nomenclador) {
      setBuscar("");
      cargarValores();
    }
  }, [open, nomenclador?._id]);

  const filtrados = valores.filter((valor) => {
    const texto = buscar.toLowerCase();

    return (
      valor.nombre.toLowerCase().includes(texto) ||
      valor.codigo.toLowerCase().includes(texto)
    );
  });

  const abrirNuevo = () => {
    setValorEditar(null);
    setDialogValor(true);
  };

  const abrirEditar = (valor: NomencladorValor) => {
    setValorEditar(valor);
    setDialogValor(true);
  };

  const cambiarEstado = async (
    valor: NomencladorValor,
  ) => {
    try {
      const actualizado =
        await nomencladoresApi.cambiarEstadoValor(
          valor._id,
          !valor.activo,
        );

      setValores((actuales) =>
        actuales.map((item) =>
          item._id === actualizado._id
            ? actualizado
            : item,
        ),
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "No se pudo cambiar el estado",
      );
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h6">
              {nomenclador?.nombre}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Administración de valores
            </Typography>
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <TextField
                size="small"
                placeholder="Buscar por nombre o código..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                sx={{ minWidth: 250, flex: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={abrirNuevo}
              >
                Nuevo valor
              </Button>
            </Box>

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
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
                        colSpan={5}
                        align="center"
                      >
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                      >
                        No hay valores para mostrar
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((valor) => (
                      <TableRow key={valor._id} hover>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                            }}
                          >
                            {valor.codigo}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {valor.nombre}
                        </TableCell>

                        <TableCell>
                          {valor.orden}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              valor.activo
                                ? "Activo"
                                : "Inactivo"
                            }
                            color={
                              valor.activo
                                ? "success"
                                : "default"
                            }
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() =>
                                abrirEditar(valor)
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip
                            title={
                              valor.activo
                                ? "Desactivar"
                                : "Activar"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                cambiarEstado(valor)
                              }
                              color={
                                valor.activo
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {valor.activo ? (
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
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <ValorNomencladorDialog
        open={dialogValor}
        nomenclador={nomenclador}
        valor={valorEditar}
        onClose={() => setDialogValor(false)}
        onSaved={cargarValores}
      />
    </>
  );
}