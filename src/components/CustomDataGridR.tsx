// src/components/CustomDataGridR.tsx
import * as React from "react";
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TableSortLabel,
    Checkbox,
    Toolbar,
    Typography,
    TextField,
    IconButton,
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Grid,
    Chip,
    Avatar,
    Menu,
    MenuItem,
    CircularProgress,
    Alert,
    FormControlLabel,
    Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Order = "asc" | "desc";

export type ColumnType = "text" | "number" | "date";

export interface Column<T> {
    field: keyof T;
    headerName: string;
    numeric?: boolean;
    filterable?: boolean;
    isStatusColumn?: boolean;
    /**
     * Tipo de dato, usado por el filtro para ofrecer los operadores correctos.
     * Si se omite: `numeric` => "number"; si todos los valores son fechas
     * AAAA-MM-DD => "date"; en otro caso "text".
     */
    type?: ColumnType;
    /**
     * Solo aplica cuando se usa `editConfig`. Con `false` el campo se muestra
     * deshabilitado en el diálogo de edición y nunca se envía al backend
     * (ids, columnas calculadas, referencias a otras colecciones, etc.).
     */
    editable?: boolean;
}

export type FilterOperator =
    | "contains"
    | "notContains"
    | "equals"
    | "notEquals"
    | "startsWith"
    | "endsWith"
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "isEmpty"
    | "isNotEmpty";

interface FilterRule<T> {
    id: number;
    field: keyof T;
    operator: FilterOperator;
    value: string;
}

interface OperatorOption {
    value: FilterOperator;
    label: string;
}

const EMPTY_OPERATORS: OperatorOption[] = [
    { value: "isEmpty", label: "está vacío" },
    { value: "isNotEmpty", label: "no está vacío" },
];

const OPERATORS: Record<ColumnType, OperatorOption[]> = {
    text: [
        { value: "contains", label: "contiene" },
        { value: "notContains", label: "no contiene" },
        { value: "equals", label: "es igual a" },
        { value: "notEquals", label: "es distinto de" },
        { value: "startsWith", label: "empieza con" },
        { value: "endsWith", label: "termina con" },
        ...EMPTY_OPERATORS,
    ],
    number: [
        { value: "eq", label: "= igual a" },
        { value: "neq", label: "≠ distinto de" },
        { value: "gt", label: "> mayor que" },
        { value: "gte", label: "≥ mayor o igual que" },
        { value: "lt", label: "< menor que" },
        { value: "lte", label: "≤ menor o igual que" },
        ...EMPTY_OPERATORS,
    ],
    date: [
        { value: "eq", label: "es el" },
        { value: "neq", label: "no es el" },
        { value: "gt", label: "es posterior a" },
        { value: "gte", label: "desde (incluye)" },
        { value: "lt", label: "es anterior a" },
        { value: "lte", label: "hasta (incluye)" },
        ...EMPTY_OPERATORS,
    ],
};

const NO_VALUE_OPERATORS: FilterOperator[] = ["isEmpty", "isNotEmpty"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

const cellText = (value: unknown): string =>
    value === null || value === undefined ? "" : String(value);

/** "1,234.50" / "$12" / 7 -> número; NaN si no hay ningún número. */
const toNumber = (value: unknown): number => {
    const cleaned = cellText(value).replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
    return Number(cleaned);
};

const compare = <V extends number | string>(a: V, b: V, op: FilterOperator): boolean => {
    switch (op) {
        case "eq": return a === b;
        case "neq": return a !== b;
        case "gt": return a > b;
        case "gte": return a >= b;
        case "lt": return a < b;
        case "lte": return a <= b;
        default: return true;
    }
};

/** Una regla incompleta (sin valor) no filtra nada. */
const matchesRule = <T,>(row: T, rule: FilterRule<T>, type: ColumnType): boolean => {
    const text = cellText(row[rule.field]);

    if (rule.operator === "isEmpty") return text.trim() === "";
    if (rule.operator === "isNotEmpty") return text.trim() !== "";
    if (rule.value.trim() === "") return true;

    if (type === "number") {
        const a = toNumber(text);
        const b = toNumber(rule.value);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;
        return compare(a, b, rule.operator);
    }

    if (type === "date") {
        const a = text.slice(0, 10);
        if (!DATE_RE.test(a)) return false;
        return compare(a, rule.value.slice(0, 10), rule.operator);
    }

    const a = text.toLowerCase();
    const b = rule.value.trim().toLowerCase();
    switch (rule.operator) {
        case "contains": return a.includes(b);
        case "notContains": return !a.includes(b);
        case "equals": return a === b;
        case "notEquals": return a !== b;
        case "startsWith": return a.startsWith(b);
        case "endsWith": return a.endsWith(b);
        default: return true;
    }
};

/** Mensaje legible a partir de una respuesta de error de NestJS. */
const backendMessage = (data: { message?: string | string[] } | undefined, fallback: string): string => {
    const message = data?.message;
    if (Array.isArray(message)) return message.join(". ");
    return message || fallback;
};

// ═══════════════════════════════════════════════════════════════
// ✅ CORREGIDO: DeleteConfig ahora es genérico <T>
// ═══════════════════════════════════════════════════════════════
export interface DeleteConfig<T = any> {
    /** URL base del endpoint DELETE, ej: 'http://localhost:3000/producto' */
    baseUrl: string;
    /** Función para extraer el ID del row. Por defecto usa getRowId */
    getId?: (row: T) => string;
    /** Callback opcional después de eliminar exitosamente */
    onSuccess?: () => void;
    /** Callback opcional en caso de error */
    onError?: (error: Error) => void;
}

export interface EditConfig<T = unknown> {
    /** URL base del endpoint PATCH, ej: 'http://localhost:3000/producto' */
    baseUrl: string;
    /** Función para extraer el ID del row. Por defecto usa getRowId */
    getId?: (row: T) => string;
    /**
     * Nombre del campo en el backend cuando difiere del de la tabla,
     * ej: { producto: 'nombre_producto' }. Los no listados se envían con
     * el mismo nombre que tienen en la tabla.
     */
    fieldMap?: Partial<Record<keyof T, string>>;
    /**
     * Control total del cuerpo del PATCH. Recibe solo los campos modificados
     * (con las columnas numéricas ya convertidas a número) y la fila original.
     */
    buildPayload?: (changes: Partial<T>, row: T) => Record<string, unknown>;
    /** Callback después de guardar. Recibe la respuesta del backend. */
    onSuccess?: (updated: unknown) => void;
    /** Callback opcional en caso de error */
    onError?: (error: Error) => void;
}

// ═══════════════════════════════════════════════════════════════
// ✅ CORREGIDO: DeleteConfig<T> recibe el tipo de la fila
// ═══════════════════════════════════════════════════════════════
interface CustomDataGridProps<T> {
    rows: T[];
    columns: Column<T>[];
    getRowId: (row: T) => number | string;
    title?: string;
    /**
     * Acción de edición propia. Se llama con la fila modificada desde el
     * diálogo "Editar". Ignorada si se pasa `editConfig`.
     */
    onEditRow?: (row: T) => void;
    /** Activa la edición con petición PATCH al backend. */
    editConfig?: EditConfig<T>;
    deleteConfig?: DeleteConfig<T>;
    getRowAvatar?: (row: T) => string | React.ReactNode;
}

const getStatusStyles = (status: string) => {
    const lowerStatus = String(status).toLowerCase().trim();

    switch (lowerStatus) {
        case 'activo':
        case 'disponible':
        case 'en stock':
        case 'completada':
            return {
                backgroundColor: 'rgba(10, 218, 20, 0.12)',
                color: 'rgb(10, 218, 20)',
                borderColor: 'rgba(10, 218, 20, 0.3)',
            };
        case 'inactivo':
        case 'no disponible':
        case 'agotado':
            return {
                backgroundColor: 'rgba(255, 0, 0, 0.08)',
                color: 'rgb(220, 20, 60)',
                borderColor: 'rgba(255, 0, 0, 0.3)',
            };
        case 'pending':
        case 'pendiente':
        case 'espera':
            return {
                backgroundColor: 'rgba(255, 165, 0, 0.12)',
                color: 'rgb(255, 140, 0)',
                borderColor: 'rgba(255, 165, 0, 0.3)',
            };
        case 'on sale':
        case 'en venta':
        case 'oferta':
        case 'promocion':
            return {
                backgroundColor: 'rgba(10, 83, 218, 0.12)',
                color: 'rgb(10, 83, 218)',
                borderColor: 'rgba(10, 83, 218, 0.3)',
            };
        case 'bouncing':
        case 'rebotando':
        case 'en revisión':
        case 'revision':
            return {
                backgroundColor: 'rgba(196, 45, 226, 0.10)',
                color: 'rgb(196, 45, 226)',
                borderColor: 'rgba(196, 45, 226, 0.3)',
            };
        default:
            return {
                backgroundColor: 'rgba(128, 128, 128, 0.10)',
                color: 'rgb(100, 100, 100)',
                borderColor: 'rgba(128, 128, 128, 0.3)',
            };
    }
};

export default function CustomDataGridR<T>({
    rows,
    columns,
    getRowId,
    title = "Tabla",
    onEditRow,
    editConfig,
    deleteConfig,
    getRowAvatar,
}: CustomDataGridProps<T>) {
    const [order, setOrder] = React.useState<Order>("asc");
    const [orderBy, setOrderBy] = React.useState<keyof T>(columns[0].field);
    const [selected, setSelected] = React.useState<(number | string)[]>([]);
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [loading, setLoading] = useState<boolean>(false);

    const [search, setSearch] = React.useState("");
    const [columnFilters, setColumnFilters] = React.useState<
        Partial<Record<keyof T, string>>
    >({});

    // ─── Filtro avanzado (columna + operador + valor) ───
    const [openFilterDialog, setOpenFilterDialog] = React.useState(false);
    const [appliedFilters, setAppliedFilters] = React.useState<FilterRule<T>[]>([]);
    const [draftFilters, setDraftFilters] = React.useState<FilterRule<T>[]>([]);
    const ruleIdRef = React.useRef(0);

    // ─── Columnas visibles ───
    const [openColumnsDialog, setOpenColumnsDialog] = React.useState(false);
    const [hiddenFields, setHiddenFields] = React.useState<(keyof T)[]>([]);

    const visibleColumns = React.useMemo(
        () => columns.filter((column) => !hiddenFields.includes(column.field)),
        [columns, hiddenFields]
    );

    /** La columna "Acciones" solo existe si hay algo que hacer con la fila. */
    const hasActions = Boolean(onEditRow || editConfig || deleteConfig);
    const canEdit = Boolean(onEditRow || editConfig);

    const columnTypes = React.useMemo(() => {
        const map = new Map<keyof T, ColumnType>();
        columns.forEach((column) => {
            if (column.type) return map.set(column.field, column.type);
            if (column.numeric) return map.set(column.field, "number");

            let seen = 0;
            let allDates = true;
            for (const row of rows) {
                const text = cellText(row[column.field]);
                if (text === "") continue;
                if (!DATE_RE.test(text)) {
                    allDates = false;
                    break;
                }
                seen++;
            }
            map.set(column.field, allDates && seen > 0 ? "date" : "text");
        });
        return map;
    }, [rows, columns]);

    const typeOf = (field: keyof T): ColumnType => columnTypes.get(field) ?? "text";

    const newRule = (field?: keyof T): FilterRule<T> => {
        const f = field ?? columns[0].field;
        ruleIdRef.current += 1;
        return { id: ruleIdRef.current, field: f, operator: OPERATORS[typeOf(f)][0].value, value: "" };
    };

    const handleOpenFilter = () => {
        setDraftFilters(appliedFilters.length > 0 ? appliedFilters : [newRule()]);
        setOpenFilterDialog(true);
    };

    const updateRule = (id: number, patch: Partial<FilterRule<T>>) =>
        setDraftFilters((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

    const changeRuleField = (id: number, field: keyof T) =>
        updateRule(id, { field, operator: OPERATORS[typeOf(field)][0].value, value: "" });

    const handleApplyFilters = () => {
        // Se descartan las condiciones sin valor (salvo "está vacío"/"no está vacío").
        setAppliedFilters(
            draftFilters.filter(
                (rule) => NO_VALUE_OPERATORS.includes(rule.operator) || rule.value.trim() !== ""
            )
        );
        setPage(0);
        setSelected([]);
        setOpenFilterDialog(false);
    };

    const handleClearFilters = () => {
        setAppliedFilters([]);
        setDraftFilters([newRule()]);
        setPage(0);
        setSelected([]);
        setOpenFilterDialog(false);
    };

    const toggleColumn = (field: keyof T) =>
        setHiddenFields((prev) =>
            prev.includes(field)
                ? prev.filter((f) => f !== field)
                : // siempre debe quedar al menos una columna visible
                  columns.length - prev.length > 1
                  ? [...prev, field]
                  : prev
        );

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [menuRow, setMenuRow] = React.useState<T | null>(null);

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, row: T) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setMenuRow(row);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuRow(null);
    };

    const handleRequestSort = (property: keyof T) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelected(filteredRows.map((row) => getRowId(row)));
        } else {
            setSelected([]);
        }
    };

    const handleRowClick = (id: number | string) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    };

    const filteredRows = React.useMemo(() => {
        return rows.filter((row) => {
            const matchesSearch =
                search === "" ||
                Object.values(row as any).some((value) =>
                    String(value).toLowerCase().includes(search.toLowerCase())
                );

            const matchesColumnFilters = columns.every((column) => {
                const filterValue = columnFilters[column.field];
                if (!filterValue) return true;

                return String(row[column.field])
                    .toLowerCase()
                    .includes(filterValue.toLowerCase());
            });

            const matchesAdvancedFilters = appliedFilters.every((rule) =>
                matchesRule(row, rule, typeOf(rule.field))
            );

            return matchesSearch && matchesColumnFilters && matchesAdvancedFilters;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, search, columnFilters, columns, appliedFilters, columnTypes]);

    const sortedRows = React.useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (bValue < aValue) return order === "asc" ? 1 : -1;
            if (bValue > aValue) return order === "asc" ? -1 : 1;
            return 0;
        });
    }, [filteredRows, order, orderBy]);

    const visibleRows = sortedRows.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const handleExportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(title, 14, 15);

        const tableColumn = visibleColumns.map((col) => col.headerName);

        const tableRows = filteredRows.map((row) =>
            visibleColumns.map((col) => cellText(row[col.field]))
        );

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });

        doc.save(`${title}.pdf`);
    };

    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
    const [rowToDelete, setRowToDelete] = React.useState<T | null>(null);
    const [openEditDialog, setOpenEditDialog] = React.useState(false);
    const [rowToEdit, setRowToEdit] = React.useState<T | null>(null);
    const [editForm, setEditForm] = React.useState<Partial<T>>({});

    // ═══════════════════════════════════════════════════════════════
    // NUEVO: Estado para manejar errores del diálogo de eliminación
    // ═══════════════════════════════════════════════════════════════
    const [deleteError, setDeleteError] = React.useState<string | null>(null);
    const [editError, setEditError] = React.useState<string | null>(null);

    const handleEditChange = (field: keyof T, value: any) => {
        setEditForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const closeEditDialog = () => {
        setOpenEditDialog(false);
        setRowToEdit(null);
        setEditError(null);
    };

    // ═══════════════════════════════════════════════════════════════
    // Guardar edición: con editConfig envía un PATCH solo con los
    // campos modificados; sin él, conserva el comportamiento anterior
    // (devuelve la fila a través de onEditRow).
    // ═══════════════════════════════════════════════════════════════
    const handleSaveEdit = async () => {
        if (!rowToEdit) return;

        if (!editConfig) {
            onEditRow?.({ ...rowToEdit, ...editForm } as T);
            closeEditDialog();
            return;
        }

        // 1) Detectar y validar los cambios
        const changes: Partial<T> = {};
        for (const column of columns) {
            if (column.editable === false) continue;

            const original = rowToEdit[column.field];
            const raw = cellText(editForm[column.field]);
            const isNumber = typeOf(column.field) === "number";

            if (isNumber) {
                const value = Number(raw.trim());
                if (raw.trim() === "" || !Number.isFinite(value)) {
                    setEditError(`"${column.headerName}" debe ser un número válido`);
                    return;
                }
                if (value !== Number(original)) changes[column.field] = value as T[keyof T];
            } else if (raw.trim() !== cellText(original).trim()) {
                changes[column.field] = raw.trim() as T[keyof T];
            }
        }

        const changedFields = Object.keys(changes) as (keyof T)[];
        if (changedFields.length === 0) {
            closeEditDialog(); // nada que guardar
            return;
        }

        // 2) Construir el cuerpo del PATCH
        const payload: Record<string, unknown> = editConfig.buildPayload
            ? editConfig.buildPayload(changes, rowToEdit)
            : Object.fromEntries(
                  changedFields.map((field) => [editConfig.fieldMap?.[field] ?? String(field), changes[field]])
              );

        // 3) Enviar
        setLoading(true);
        setEditError(null);
        try {
            const id = editConfig.getId ? editConfig.getId(rowToEdit) : String(getRowId(rowToEdit));
            const response = await fetch(`${editConfig.baseUrl}/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => undefined);

            if (!response.ok) {
                throw new Error(backendMessage(data, `Error ${response.status}: No se pudo guardar el registro`));
            }

            closeEditDialog();
            editConfig.onSuccess?.(data);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Error al guardar el registro");
            setEditError(error.message);
            editConfig.onError?.(error);
        } finally {
            setLoading(false);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // NUEVO: Handler para realizar la petición DELETE al backend
    // ═══════════════════════════════════════════════════════════════
    const handleConfirmDelete = async () => {
        if (!rowToDelete || !deleteConfig) {
            setOpenDeleteDialog(false);
            setRowToDelete(null);
            return;
        }

        setLoading(true);
        setDeleteError(null);

        try {
            // Extraer el ID del registro a eliminar
            const idToDelete = deleteConfig.getId
                ? deleteConfig.getId(rowToDelete)
                : String(getRowId(rowToDelete));

            // Construir la URL: baseUrl + /:id
            // Ejemplo: http://localhost:3000/producto/507f1f77bcf86cd799439011
            const deleteUrl = `${deleteConfig.baseUrl}/${idToDelete}`;

            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || `Error ${response.status}: No se pudo eliminar el registro`
                );
            }

            // Éxito: cerrar diálogo y notificar
            setOpenDeleteDialog(false);
            setRowToDelete(null);
            deleteConfig.onSuccess?.();
        } catch (err: any) {
            setDeleteError(err.message || 'Error al eliminar el registro');
            deleteConfig.onError?.(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: "100%", p: 1, overflow: 'hidden' }}>
            <Paper
                sx={{
                    width: "100%",
                    mb: 2,
                    borderRadius: 3,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 250px)',
                    overflow: 'hidden',
                }}
            >
                <Toolbar
                    sx={{
                        display: "flex",
                        gap: 2,
                        px: 3,
                        py: 2,
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                        flexWrap: 'wrap',
                    }}
                >
                    <Typography
                        sx={{
                            flex: "1 1 auto",
                            fontWeight: 600,
                            fontSize: '1.35rem',
                            background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            letterSpacing: '-0.02em',
                        }}
                        variant="h6"
                    >
                        {title}
                    </Typography>

                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: 'wrap' }}>
                        <Box sx={{ px: 1 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 3,
                                        backgroundColor: '#f1f1f1',
                                        border: 'none',
                                        '& fieldset': {
                                            border: 'none',
                                        },
                                        '&:hover fieldset': {
                                            border: 'none',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: '1px solid rgba(10, 83, 218, 0.3)',
                                        },
                                        px: 1.5,
                                        py: 0.5,
                                    },
                                    '& .MuiInputBase-input': {
                                        fontSize: '0.9rem',
                                        '&::placeholder': {
                                            color: '#aaa',
                                            opacity: 1,
                                        }
                                    }
                                }}
                            />
                        </Box>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: '#666',
                            fontSize: '0.875rem',
                        }}>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 15]}
                                sx={{
                                    '& .MuiTablePagination-displayedRows': {
                                        display: 'none',
                                    },
                                    '& .MuiTablePagination-actions': {
                                        display: 'none',
                                    },
                                }}
                                component="div"
                                count={filteredRows.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={(_, newPage) => setPage(newPage)}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                labelRowsPerPage="Paginación"
                            />
                        </Box>

                        <Button
                            variant="contained"
                            size="small"
                            onClick={handleOpenFilter}
                            startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none',
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                color: "#fff",
                                boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                borderRadius: 1,
                                px: 2,
                                py: 0.8,
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(10, 83, 218, 1), rgba(10, 218, 20, 1))",
                                    boxShadow: "0 6px 16px rgba(9, 80, 212, 0.58)"
                                }
                            }}
                        >
                            {appliedFilters.length > 0 ? `Filtrar (${appliedFilters.length})` : "Filtrar"}
                        </Button>

                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setOpenColumnsDialog(true)}
                            startIcon={<ViewColumnIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none',
                                background: "linear-gradient(135deg, rgba(196, 45, 226, 0.9), rgba(10, 83, 218, 0.9))",
                                color: "#fff",
                                boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                borderRadius: 1,
                                px: 2,
                                py: 0.8,
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(196, 45, 226, 1), rgba(10, 83, 218, 1))",
                                    boxShadow: "0 6px 16px rgba(120, 40, 200, 0.5)"
                                }
                            }}
                        >
                            {hiddenFields.length > 0
                                ? `Columnas (${visibleColumns.length}/${columns.length})`
                                : "Columnas"}
                        </Button>

                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none',
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                                boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                                color: '#ffffff',
                                borderRadius: 1,
                                px: 2,
                                py: 0.8,
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                    boxShadow: "0 4px 12px rgba(158, 6, 6, 0.62)"
                                }
                            }}
                            onClick={handleExportPDF}
                        >
                            Exportar PDF
                        </Button>
                    </Stack>
                </Toolbar>

                {/* CONTENEDOR CON SCROLL HORIZONTAL CONTROLADO */}
                <Box
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        px: 2,
                        pt: 1,
                        minHeight: 200,
                        width: '100%',
                        '&::-webkit-scrollbar': {
                            width: 8,
                            height: 8,
                        },
                        '&::-webkit-scrollbar-track': {
                            backgroundColor: 'rgba(0,0,0,0.04)',
                            borderRadius: 4,
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(10, 83, 218, 0.3)',
                            borderRadius: 4,
                            '&:hover': {
                                backgroundColor: 'rgba(10, 83, 218, 0.5)',
                            }
                        },
                    }}
                >
                    <TableContainer sx={{ overflow: 'visible', minWidth: '100%' }}>
                        <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: '0 4px', width: 'max-content', minWidth: '100%' }}>
                            <TableHead sx={{ borderRadius: 3, overflow: 'hidden' }}>
                                <TableRow sx={{
                                    '& th': {
                                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                                        color: '#888',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        py: 1.5,
                                    },
                                    '& th:first-of-type': {
                                        borderTopLeftRadius: 12,
                                    },
                                    '& th:last-of-type': {
                                        borderTopRightRadius: 12,
                                    },
                                }}>
                                    <TableCell padding="checkbox" sx={{ pl: 2, width: 48, minWidth: 48 }}>
                                        <Checkbox
                                            checked={
                                                filteredRows.length > 0 &&
                                                selected.length === filteredRows.length
                                            }
                                            indeterminate={
                                                selected.length > 0 &&
                                                selected.length < filteredRows.length
                                            }
                                            onChange={handleSelectAll}
                                            sx={{
                                                color: '#ddd',
                                                '&.Mui-checked': {
                                                    color: 'rgb(10, 83, 218)',
                                                }
                                            }}
                                        />
                                    </TableCell>

                                    {getRowAvatar && (
                                        <TableCell sx={{ width: 50, minWidth: 50, pl: 1 }}>Avatar</TableCell>
                                    )}

                                    {visibleColumns.map((column) => (
                                        <TableCell
                                            key={String(column.field)}
                                            align={column.numeric ? "right" : "left"}
                                            sortDirection={
                                                orderBy === column.field ? order : false
                                            }
                                            sx={{ fontWeight: 600, whiteSpace: 'nowrap', px: 2, minWidth: 120 }}
                                        >
                                            <TableSortLabel
                                                active={orderBy === column.field}
                                                direction={
                                                    orderBy === column.field ? order : "asc"
                                                }
                                                onClick={() =>
                                                    handleRequestSort(column.field)
                                                }
                                                sx={{
                                                    '& .MuiTableSortLabel-icon': {
                                                        color: '#bbb !important',
                                                    }
                                                }}
                                            >
                                                {column.headerName}
                                            </TableSortLabel>

                                            {column.filterable && (
                                                <TextField
                                                    size="small"
                                                    variant="standard"
                                                    placeholder="Filter"
                                                    value={
                                                        columnFilters[column.field] || ""
                                                    }
                                                    onChange={(e) =>
                                                        setColumnFilters((prev) => ({
                                                            ...prev,
                                                            [column.field]: e.target.value,
                                                        }))
                                                    }
                                                    sx={{
                                                        mt: 0.5,
                                                        '& .MuiInput-root': {
                                                            fontSize: '0.7rem',
                                                            '&:before': { borderBottom: '1px solid rgba(0,0,0,0.1)' },
                                                            '&:hover:before': { borderBottom: '1px solid rgba(0,0,0,0.2)' },
                                                        }
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                    ))}

                                    {hasActions && (
                                        <TableCell align="center" sx={{ width: 80, minWidth: 80, whiteSpace: 'nowrap' }}>Acciones</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {visibleRows.map((row, index) => {
                                    const id = getRowId(row);
                                    const isSelected = selected.includes(id);

                                    return (
                                        <TableRow
                                            key={id}
                                            hover
                                            selected={isSelected}
                                            onClick={() => handleRowClick(id)}
                                            sx={{
                                                cursor: "pointer",
                                                backgroundColor: isSelected ? 'rgba(10, 83, 218, 0.04)' : '#fff',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: isSelected ? 'rgba(10, 83, 218, 0.06)' : '#fafbfc',
                                                    transform: 'translateY(-1px)',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                                },
                                                borderRadius: 2,
                                                '& td': {
                                                    borderBottom: index === visibleRows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)',
                                                    py: 1.8,
                                                    fontSize: '0.85rem',
                                                    color: '#444',
                                                },
                                                '& td:first-of-type': {
                                                    borderTopLeftRadius: 12,
                                                    borderBottomLeftRadius: 12,
                                                    pl: 2,
                                                },
                                                '& td:last-of-type': {
                                                    borderTopRightRadius: 12,
                                                    borderBottomRightRadius: 12,
                                                    pr: 2,
                                                },
                                            }}
                                        >
                                            <TableCell padding="checkbox" sx={{ width: 48, minWidth: 48 }}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    sx={{
                                                        color: '#ddd',
                                                        '&.Mui-checked': {
                                                            color: 'rgb(10, 83, 218)',
                                                        }
                                                    }}
                                                />
                                            </TableCell>

                                            {getRowAvatar && (
                                                <TableCell sx={{ width: 50, pl: 1 }}>
                                                    <Avatar
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.15), rgba(196, 45, 226, 0.15))",
                                                            color: 'rgb(10, 83, 218)',
                                                        }}
                                                    >
                                                        {typeof getRowAvatar(row) === 'string'
                                                            ? (getRowAvatar(row) as string).charAt(0).toUpperCase()
                                                            : getRowAvatar(row)
                                                        }
                                                    </Avatar>
                                                </TableCell>
                                            )}

                                            {visibleColumns.map((column) => {
                                                const cellValue = row[column.field];
                                                const isStatus = column.isStatusColumn;

                                                return (
                                                    <TableCell
                                                        key={String(column.field)}
                                                        align={column.numeric ? "right" : "left"}
                                                        sx={{ whiteSpace: 'nowrap', px: 2, minWidth: 120 }}
                                                    >
                                                        {isStatus ? (
                                                            <Chip
                                                                label={String(cellValue)}
                                                                size="small"
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    letterSpacing: '0.02em',
                                                                    height: 28,
                                                                    ...getStatusStyles(String(cellValue)),
                                                                    border: '1.5px solid',
                                                                    '& .MuiChip-label': {
                                                                        px: 1.5,
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: column.field === columns[0].field ? 600 : 400,
                                                                    color: column.field === columns[0].field ? '#1a1a2e' : '#666',
                                                                    fontSize: '0.85rem',
                                                                }}
                                                            >
                                                                {String(cellValue)}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}

                                            {hasActions && (
                                                <TableCell align="center" sx={{ width: 80, minWidth: 80 }}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleOpenMenu(e, row)}
                                                        sx={{
                                                            color: '#bbb',
                                                            '&:hover': {
                                                                color: '#666',
                                                                backgroundColor: 'rgba(0,0,0,0.04)',
                                                            }
                                                        }}
                                                    >
                                                        <MoreVertIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>

                            {visibleRows.length === 0 && (
                                <TableBody>
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleColumns.length + 1 + (hasActions ? 1 : 0) + (getRowAvatar ? 1 : 0)}
                                            align="center"
                                            sx={{ py: 8, borderBottom: 'none' }}
                                        >
                                            <Box sx={{ textAlign: 'center' }}>
                                                <SearchOffIcon sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
                                                <Typography variant="h6" sx={{ color: '#aaa', fontWeight: 500, mb: 1 }}>
                                                    No hay datos por el momento
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.85rem' }}>
                                                    {rows.length > 0
                                                        ? 'Ningún registro coincide con los filtros aplicados'
                                                        : 'Agrega un nuevo registro para comenzar'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            )}
                        </Table>
                    </TableContainer>
                </Box>

                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    py: 2,
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                }}>
                    <Button
                        size="small"
                        sx={{
                            textTransform: 'none',
                            color: '#646464',
                            fontSize: '0.8rem',
                            '&:hover': { color: '#414141' }
                        }}
                        disabled={page === 0}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                        ‹ Anterior
                    </Button>

                    <Stack direction="row" spacing={0.5}>
                        {Array.from({ length: Math.ceil(filteredRows.length / rowsPerPage) }, (_, i) => (
                            <Button
                                key={i}
                                size="small"
                                onClick={() => setPage(i)}
                                sx={{
                                    minWidth: 32,
                                    height: 32,
                                    borderRadius: 1.5,
                                    fontSize: '0.8rem',
                                    fontWeight: page === i ? 600 : 400,
                                    backgroundColor: page === i ? 'rgb(10, 83, 218)' : 'transparent',
                                    color: page === i ? '#fff' : '#888',
                                    '&:hover': {
                                        backgroundColor: page === i ? 'rgb(10, 83, 218)' : 'rgba(0,0,0,0.04)',
                                    }
                                }}
                            >
                                {String(i + 1).padStart(2, '0')}
                            </Button>
                        ))}
                    </Stack>

                    <Button
                        size="small"
                        sx={{
                            textTransform: 'none',
                            color: '#646464',
                            fontSize: '0.8rem',
                            '&:hover': { color: '#414141' }
                        }}
                        disabled={page >= Math.ceil(filteredRows.length / rowsPerPage) - 1}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Siguiente ›
                    </Button>
                </Box>
            </Paper>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                onClick={handleCloseMenu}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            minWidth: 140,
                        }
                    }
                }}
            >
                {canEdit && (
                    <MenuItem
                        onClick={() => {
                            if (menuRow) {
                                setRowToEdit(menuRow);
                                setEditForm(menuRow);
                                setEditError(null);
                                setOpenEditDialog(true);
                            }
                        }}
                        sx={{ fontSize: '0.85rem', gap: 1.5 }}
                    >
                        <EditIcon sx={{ fontSize: 18, color: 'rgb(10, 83, 218)' }} />
                        Edit
                    </MenuItem>
                )}
                {/* ═══════════════════════════════════════════════════════
                    Solo muestra Delete si hay deleteConfig configurado
                    ═══════════════════════════════════════════════════════ */}
                {deleteConfig && (
                    <MenuItem
                        onClick={() => {
                            if (menuRow) {
                                setRowToDelete(menuRow);
                                setDeleteError(null);
                                setOpenDeleteDialog(true);
                            }
                        }}
                        sx={{ fontSize: '0.85rem', gap: 1.5, color: 'rgb(220, 20, 60)' }}
                    >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                        Delete
                    </MenuItem>
                )}
            </Menu>

            {/* ═══════════════════════════════════════════════════════════════
                DIÁLOGO DE ELIMINACIÓN CON PETICIÓN HTTP DELETE
                ═══════════════════════════════════════════════════════════════ */}
            <Dialog
                open={openDeleteDialog}
                onClose={() => {
                    if (!loading) {
                        setOpenDeleteDialog(false);
                        setRowToDelete(null);
                        setDeleteError(null);
                    }
                }}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        }
                    }
                }}
            >
                <DialogTitle>
                    <Typography variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                        Confirmar eliminación
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ textAlign: 'center', color: '#666' }}>
                        ¿Estás seguro que deseas eliminar este registro?
                        <br />
                        Esta acción no se puede deshacer.
                    </DialogContentText>

                    {/* Mensaje de error si falla la petición */}
                    {deleteError && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                            {deleteError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions
                    sx={{
                        display: "flex",
                        p: 2,
                        ml: 0,
                        gap: 2,
                        width: "100%"
                    }}
                >
                    <Button
                        onClick={() => {
                            setOpenDeleteDialog(false);
                            setRowToDelete(null);
                            setDeleteError(null);
                        }}
                        color="inherit"
                        disabled={loading}
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            color: "white",
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                boxShadow: "0 4px 12px rgb(158, 6, 6)"
                            }
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        color="error"
                        variant="contained"
                        disabled={loading}
                        fullWidth
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                            }
                        }}
                    >
                        {loading ? 'Eliminando...' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openEditDialog}
                onClose={() => {
                    if (!loading) closeEditDialog();
                }}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 1,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        }
                    }
                }}
            >
                <DialogTitle>
                    <Typography variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}>
                        Editar Registro
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {columns.map((column) => (
                            <Grid size={{ xs: 12 }} key={String(column.field)}>
                                <TextField
                                    fullWidth
                                    label={column.headerName}
                                    type={editConfig && typeOf(column.field) === "number" ? "number" : "text"}
                                    disabled={loading || (Boolean(editConfig) && column.editable === false)}
                                    value={cellText(editForm[column.field])}
                                    onChange={(e) =>
                                        handleEditChange(column.field, e.target.value)
                                    }
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                        }
                                    }}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    {editError && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                            {editError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions
                    sx={{
                        display: "flex",
                        p: 2,
                        ml: 0,
                        gap: 2,
                        width: "100%"
                    }}>
                    <Button
                        disabled={loading}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            color: "white",
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(226, 45, 187, 0.9))",
                                boxShadow: "0 4px 12px rgb(158, 6, 6)"
                            }
                        }}
                        startIcon={<CancelIcon />}
                        onClick={closeEditDialog}
                        color="inherit"
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                            "&:hover": {
                                background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                                boxShadow: "0 4px 12px rgba(13, 248, 5, 0.93)"
                            }
                        }}
                        onClick={handleSaveEdit}
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════ DIÁLOGO DE FILTRADO ═══════════════ */}
            <Dialog
                open={openFilterDialog}
                onClose={() => setOpenFilterDialog(false)}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } } }}
            >
                <DialogTitle>
                    <Typography
                        variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(0, 89, 255, 0.84), rgba(230, 21, 118, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Filtrar {title}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {draftFilters.map((rule) => {
                            const type = typeOf(rule.field);
                            const needsValue = !NO_VALUE_OPERATORS.includes(rule.operator);
                            return (
                                <Stack
                                    key={rule.id}
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={1.5}
                                    sx={{ alignItems: { sm: 'center' } }}
                                >
                                    <TextField
                                        select
                                        size="small"
                                        label="Columna"
                                        value={String(rule.field)}
                                        onChange={(e) => {
                                            const column = columns.find((c) => String(c.field) === e.target.value);
                                            if (column) changeRuleField(rule.id, column.field);
                                        }}
                                        sx={{ flex: 1, minWidth: 150 }}
                                    >
                                        {columns.map((column) => (
                                            <MenuItem key={String(column.field)} value={String(column.field)}>
                                                {column.headerName}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        select
                                        size="small"
                                        label="Operador"
                                        value={rule.operator}
                                        onChange={(e) =>
                                            updateRule(rule.id, { operator: e.target.value as FilterOperator })
                                        }
                                        sx={{ flex: 1, minWidth: 170 }}
                                    >
                                        {OPERATORS[type].map((op) => (
                                            <MenuItem key={op.value} value={op.value}>
                                                {op.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>

                                    <TextField
                                        size="small"
                                        label="Valor"
                                        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
                                        value={needsValue ? rule.value : ""}
                                        disabled={!needsValue}
                                        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                                        slotProps={{ inputLabel: { shrink: type === "date" || undefined } }}
                                        sx={{ flex: 1, minWidth: 150 }}
                                    />

                                    <Tooltip title="Quitar condición">
                                        <span>
                                            <IconButton
                                                size="small"
                                                aria-label="Quitar condición"
                                                disabled={draftFilters.length === 1}
                                                onClick={() =>
                                                    setDraftFilters((prev) => prev.filter((r) => r.id !== rule.id))
                                                }
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            );
                        })}

                        <Box>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => setDraftFilters((prev) => [...prev, newRule()])}
                                sx={{ textTransform: 'none' }}
                            >
                                Agregar condición
                            </Button>
                        </Box>

                        {draftFilters.length > 1 && (
                            <Typography variant="caption" sx={{ color: '#888' }}>
                                Se muestran los registros que cumplen todas las condiciones.
                            </Typography>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 2, "& > :not(style) ~ :not(style)": { ml: 0 } }}>
                    <Button
                        onClick={handleClearFilters}
                        color="inherit"
                        startIcon={<CancelIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(255,0,0,0.9), rgba(196, 45, 226, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            color: "white",
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Limpiar filtros
                    </Button>
                    <Button
                        onClick={handleApplyFilters}
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        sx={{
                            flex: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                            boxShadow: "0 4px 19px rgba(0,0,0,0.2)",
                            borderRadius: 1,
                            textTransform: 'none',
                            fontWeight: 600,
                        }}
                    >
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ═══════════════ DIÁLOGO DE COLUMNAS ═══════════════ */}
            <Dialog
                open={openColumnsDialog}
                onClose={() => setOpenColumnsDialog(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } } }}
            >
                <DialogTitle>
                    <Typography
                        variant="h6"
                        sx={{
                            borderRadius: 1,
                            boxShadow: 2,
                            p: 1,
                            textAlign: "center",
                            background: "linear-gradient(135deg, rgba(196, 45, 226, 0.9), rgba(10, 83, 218, 0.9))",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Columnas visibles
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <Stack sx={{ mt: 1 }}>
                        {columns.map((column) => {
                            const visible = !hiddenFields.includes(column.field);
                            return (
                                <FormControlLabel
                                    key={String(column.field)}
                                    label={column.headerName}
                                    control={
                                        <Checkbox
                                            checked={visible}
                                            // no se puede ocultar la última columna visible
                                            disabled={visible && visibleColumns.length === 1}
                                            onChange={() => toggleColumn(column.field)}
                                        />
                                    }
                                />
                            );
                        })}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => setHiddenFields([])}
                        disabled={hiddenFields.length === 0}
                        sx={{ textTransform: 'none' }}
                    >
                        Mostrar todas
                    </Button>
                    <Button
                        onClick={() => setOpenColumnsDialog(false)}
                        variant="contained"
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1,
                            background: "linear-gradient(135deg, rgba(10, 83, 218, 0.9), rgba(10, 218, 20, 0.9))",
                        }}
                    >
                        Listo
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}