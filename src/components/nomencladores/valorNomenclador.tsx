
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

import type { Nomenclador, NomencladorValor, CrearValorDto, } from "../../service/nomencladoresApi";
import { nomencladoresApi } from "../../service/nomencladoresApi";

interface Props {
    open: boolean;
    nomenclador: Nomenclador | null;
    valor?: NomencladorValor | null;
    onClose: () => void;
    onSaved: () => Promise<void> | void;
}

const inicial: CrearValorDto = {
    codigo: "",
    nombre: "",
    descripcion: "",
    activo: true,
    orden: 1,
};

export default function ValorNomencladorDialog({
    open,
    nomenclador,
    valor = null,
    onClose,
    onSaved,
}: Props) {
    const [form, setForm] = useState(inicial);
    const [errores, setErrores] = useState<
        Record<string, string>
    >({});
    const [loading, setLoading] = useState(false);
    const [errorGeneral, setErrorGeneral] = useState("");

    const edicion = Boolean(valor?._id);

    useEffect(() => {
        if (open) {
            setForm(
                valor
                    ? {
                        codigo: valor.codigo,
                        nombre: valor.nombre,
                        descripcion: valor.descripcion ?? "",
                        activo: valor.activo,
                        orden: valor.orden,
                    }
                    : inicial,
            );

            setErrores({});
            setErrorGeneral("");
        }
    }, [open, valor]);

    const cambiar = (
        campo: keyof CrearValorDto,
        value: string | number | boolean,
    ) => {
        setForm((actual) => ({
            ...actual,
            [campo]: value,
        }));

        setErrores((actual) => ({
            ...actual,
            [campo]: "",
        }));
    };

    const cambiarNombre = (nombre: string) => {
        setForm((actual) => ({
            ...actual,
            nombre,
            ...(edicion ||
                actual.codigo !== generarCodigo(actual.nombre)
                ? {}
                : { codigo: generarCodigo(nombre) }),
        }));

        setErrores((actual) => ({
            ...actual,
            nombre: "",
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
        if (!nomenclador || !validar()) return;

        setLoading(true);
        setErrorGeneral("");

        try {
            const dto = {
                ...form,
                codigo: form.codigo.trim().toUpperCase(),
                nombre: form.nombre.trim(),
                descripcion: form.descripcion?.trim() ?? "",
            };

            if (edicion && valor?._id) {
                await nomencladoresApi.actualizarValor(
                    valor._id,
                    dto,
                );
            } else {
                await nomencladoresApi.crearValor(
                    nomenclador.codigo,
                    dto,
                );
            }

            await onSaved();
            onClose();
        } catch (error: any) {
            const mensaje = error?.response?.data?.message;

            setErrorGeneral(
                Array.isArray(mensaje)
                    ? mensaje.join(", ")
                    : mensaje || "No se pudo guardar el valor",
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
                {edicion ? "Editar valor" : "Nuevo valor"}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                    {errorGeneral && (
                        <Alert severity="error">{errorGeneral}</Alert>
                    )}

                    <TextField
                        label="Nombre"
                        placeholder="Ej. Electrodomésticos"
                        value={form.nombre}
                        onChange={(e) =>
                            cambiarNombre(e.target.value)
                        }
                        error={Boolean(errores.nombre)}
                        helperText={errores.nombre}
                        required
                        fullWidth
                        autoFocus
                    />

                    <TextField
                        label="Código"
                        placeholder="ELECTRODOMESTICOS"
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
                            "Código único dentro del nomenclador"
                        }
                        required
                        fullWidth
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
                    onClick={guardar}
                    variant="contained"
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Guardar valor"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function generarCodigo(nombre: string): string {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}