
import { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
} from "@mui/material";

import type { Nomenclador, CrearNomencladorDto, } from "../../service/nomencladoresApi";

interface Props {
    open: boolean;
    nomenclador?: Nomenclador | null;
    onClose: () => void;
    onSave: (data: CrearNomencladorDto) => Promise<void>;
}

const inicial: CrearNomencladorDto = {
    codigo: "",
    nombre: "",
    descripcion: "",
    activo: true,
    orden: 1,
    esSistema: false,
};

export default function NomencladorDialog({
    open,
    nomenclador,
    onClose,
    onSave,
}: Props) {
    const [form, setForm] = useState(inicial);
    const [errores, setErrores] = useState<
        Record<string, string>
    >({});
    const [loading, setLoading] = useState(false);
    const [errorGeneral, setErrorGeneral] = useState("");

    const edicion = Boolean(nomenclador?._id);

    useEffect(() => {
        if (open) {
            setForm(
                nomenclador
                    ? {
                        codigo: nomenclador.codigo,
                        nombre: nomenclador.nombre,
                        descripcion: nomenclador.descripcion ?? "",
                        activo: nomenclador.activo,
                        orden: nomenclador.orden,
                        esSistema: nomenclador.esSistema ?? false,
                    }
                    : inicial,
            );

            setErrores({});
            setErrorGeneral("");
        }
    }, [open, nomenclador]);

    const cambiar = (
        campo: keyof CrearNomencladorDto,
        valor: string | boolean | number,
    ) => {
        setForm((actual) => ({
            ...actual,
            [campo]: valor,
        }));

        setErrores((actual) => ({
            ...actual,
            [campo]: "",
        }));
    };

    const validar = () => {
        const e: Record<string, string> = {};

        if (!form.nombre.trim()) {
            e.nombre = "El nombre es obligatorio";
        }

        if (!form.codigo.trim()) {
            e.codigo = "El código es obligatorio";
        } else if (!/^[A-Z0-9_]+$/.test(form.codigo)) {
            e.codigo =
                "Utiliza mayúsculas, números y guiones bajos";
        }

        if (!Number.isInteger(form.orden) || form.orden < 1) {
            e.orden = "Debe ser un entero mayor que 0";
        }

        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const guardar = async () => {
        if (!validar()) return;

        setLoading(true);
        setErrorGeneral("");

        try {
            await onSave({
                ...form,
                codigo: form.codigo.trim().toUpperCase(),
                nombre: form.nombre.trim(),
                descripcion: form.descripcion?.trim() ?? "",
            });

            onClose();
        } catch (error: any) {
            const mensaje = error?.response?.data?.message;

            setErrorGeneral(
                Array.isArray(mensaje)
                    ? mensaje.join(", ")
                    : mensaje || "No se pudo guardar el nomenclador",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle>
                {edicion
                    ? "Editar nomenclador"
                    : "Nuevo nomenclador"}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                    {errorGeneral && (
                        <Alert severity="error">{errorGeneral}</Alert>
                    )}

                    <TextField
                        label="Nombre"
                        placeholder="Ej. Categorías de productos"
                        value={form.nombre}
                        onChange={(e) =>
                            cambiar("nombre", e.target.value)
                        }
                        error={Boolean(errores.nombre)}
                        helperText={errores.nombre}
                        required
                        fullWidth
                        autoFocus
                    />

                    <TextField
                        label="Código"
                        placeholder="CATEGORIA_PRODUCTO"
                        value={form.codigo}
                        onChange={(e) =>
                            cambiar(
                                "codigo",
                                e.target.value.toUpperCase(),
                            )
                        }
                        error={Boolean(errores.codigo)}
                        helperText={
                            errores.codigo ||
                            "Código único del catálogo"
                        }
                        required
                        fullWidth
                        disabled={Boolean(nomenclador?.esSistema)}
                    />

                    <TextField
                        label="Descripción"
                        value={form.descripcion ?? ""}
                        onChange={(e) =>
                            cambiar("descripcion", e.target.value)
                        }
                        multiline
                        minRows={3}
                        fullWidth
                    />

                    <TextField
                        label="Orden de presentación"
                        type="number"
                        value={form.orden}
                        onChange={(e) =>
                            cambiar("orden", Number(e.target.value))
                        }
                        error={Boolean(errores.orden)}
                        helperText={errores.orden}
                        inputProps={{ min: 1, step: 1 }}
                        fullWidth
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={form.activo}
                                onChange={(e) =>
                                    cambiar("activo", e.target.checked)
                                }
                                color="success"
                            />
                        }
                        label={form.activo ? "Activo" : "Inactivo"}
                    />
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    color="inherit"
                    disabled={loading}
                >
                    Cancelar
                </Button>

                <Button
                    variant="contained"
                    onClick={guardar}
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Guardar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}