import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CustomDataGridR from '../../components/CustomDataGridR';

interface Proveedor {
  _id: string;
  codigo: string;
  nombre: string;
  nit: string;
  codigoREU?: string;
  empresa?: { _id: string; nombre: string };
  tipo?: { _id: string; nombre: string };
  categoriasProducto?: { _id: string; nombre: string }[];
  condicionPago: string;
  monedaPreferida?: { _id: string; nombre: string };
  descuentoHabitual?: number;
  cuentaBancariaMLC?: string;
  cuentaBancariaCUP?: string;
  estado: string;
  calificacion?: number;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  contratoVigente?: string;
  fechaVencimientoContrato?: string;
  tipoContrato?: { _id: string; nombre: string };
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ESTADOS = ['activo', 'inactivo', 'suspendido', 'evaluacion'];
const CONDICIONES_PAGO = ['contado', '15_dias', '30_dias', '45_dias', '60_dias', '90_dias'];

const columns = [
  { field: 'codigo', headerName: 'Código', width: 110 },
  { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 200 },
  { field: 'nit', headerName: 'NIT', width: 130 },
  {
    field: 'estado',
    headerName: 'Estado',
    width: 100,
    renderCell: (params: { value: string }) => {
      const colors: Record<string, string> = {
        activo: '#2e7d32',
        inactivo: '#757575',
        suspendido: '#d32f2f',
        evaluacion: '#ed6c02',
      };
      return (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: colors[params.value] || 'inherit', textTransform: 'capitalize' }}
        >
          {params.value}
        </Typography>
      );
    },
  },
  { field: 'calificacion', headerName: 'Calif.', width: 70, align: 'center' as const },
  { field: 'condicionPago', headerName: 'Cond. Pago', width: 120 },
  { field: 'contactoNombre', headerName: 'Contacto', width: 150 },
  { field: 'contactoTelefono', headerName: 'Teléfono', width: 130 },
  { field: 'contactoEmail', headerName: 'Email', width: 190 },
  { field: 'descuentoHabitual', headerName: 'Desc.%', width: 80, align: 'center' as const },
];

const initialForm = {
  codigo: '',
  nombre: '',
  nit: '',
  codigoREU: '',
  empresa: '',
  tipo: '',
  categoriasProducto: '',
  condicionPago: '',
  monedaPreferida: '',
  descuentoHabitual: '',
  cuentaBancariaMLC: '',
  cuentaBancariaCUP: '',
  estado: 'activo',
  calificacion: '',
  contactoNombre: '',
  contactoTelefono: '',
  contactoEmail: '',
  contratoVigente: '',
  fechaVencimientoContrato: '',
  tipoContrato: '',
  notas: '',
};

export default function ProveedoresPage() {
  const [rows, setRows] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Proveedor | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proveedor');
      if (!res.ok) throw new Error('Error al cargar proveedores');
      const data: Proveedor[] = await res.json();
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const handleNuevo = () => {
    setFormData(initialForm);
    setSelectedRow(null);
    setOpenModal(true);
  };

  const handleEditar = () => {
    if (!selectedRow) return;
    setFormData({
      codigo: selectedRow.codigo || '',
      nombre: selectedRow.nombre || '',
      nit: selectedRow.nit || '',
      codigoREU: selectedRow.codigoREU || '',
      empresa: selectedRow.empresa?._id || '',
      tipo: selectedRow.tipo?._id || '',
      categoriasProducto: selectedRow.categoriasProducto?.map((c) => c._id).join(',') || '',
      condicionPago: selectedRow.condicionPago || '',
      monedaPreferida: selectedRow.monedaPreferida?._id || '',
      descuentoHabitual: selectedRow.descuentoHabitual?.toString() || '',
      cuentaBancariaMLC: selectedRow.cuentaBancariaMLC || '',
      cuentaBancariaCUP: selectedRow.cuentaBancariaCUP || '',
      estado: selectedRow.estado || 'activo',
      calificacion: selectedRow.calificacion?.toString() || '',
      contactoNombre: selectedRow.contactoNombre || '',
      contactoTelefono: selectedRow.contactoTelefono || '',
      contactoEmail: selectedRow.contactoEmail || '',
      contratoVigente: selectedRow.contratoVigente || '',
      fechaVencimientoContrato: selectedRow.fechaVencimientoContrato
        ? selectedRow.fechaVencimientoContrato.slice(0, 10)
        : '',
      tipoContrato: selectedRow.tipoContrato?._id || '',
      notas: selectedRow.notas || '',
    });
    setOpenModal(true);
  };

  const handleEliminar = async () => {
    if (!selectedRow) return;
    if (!window.confirm(`¿Eliminar el proveedor "${selectedRow.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/proveedor/${selectedRow._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchProveedores();
      setSelectedRow(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGuardar = async () => {
    const payload: Record<string, unknown> = {
      ...formData,
      descuentoHabitual: formData.descuentoHabitual ? Number(formData.descuentoHabitual) : undefined,
      calificacion: formData.calificacion ? Number(formData.calificacion) : undefined,
      categoriasProducto: formData.categoriasProducto
        ? formData.categoriasProducto.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined) delete payload[key];
    });

    try {
      const url = selectedRow ? `/api/proveedor/${selectedRow._id}` : '/api/proveedor';
      const method = selectedRow ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      await fetchProveedores();
      setOpenModal(false);
      setSelectedRow(null);
      setFormData(initialForm);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelar = () => {
    setOpenModal(false);
    setSelectedRow(null);
    setFormData(initialForm);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        gap: 2,
        py: 2,
        px: { xs: 1, sm: 2 },
      }}
    >
      {/* ── Título ── */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Gestión de Proveedores
      </Typography>

      {/* ── Botones de acción centrados ── */}
      <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
        <Button
          variant="contained"
          size="small"
          onClick={handleNuevo}
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #2e7d32 100%)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Nuevo
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleEditar}
          disabled={!selectedRow}
          sx={{
            background: 'linear-gradient(135deg, #ed6c02 0%, #f57c00 100%)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Editar
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleEliminar}
          disabled={!selectedRow}
          sx={{
            background: 'linear-gradient(135deg, #d32f2f 0%, #7b1fa2 100%)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Eliminar
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => console.log('Excel')}
          sx={{
            background: 'linear-gradient(135deg, #00acc1 0%, #1976d2 100%)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Excel
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => console.log('PDF')}
          sx={{
            background: 'linear-gradient(135deg, #6d4c41 0%, #424242 100%)',
            color: '#fff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          PDF
        </Button>
      </Stack>

      {/* ── Modal Nuevo / Editar ── */}
      <Dialog
        open={openModal}
        onClose={handleCancelar}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedRow ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Código"
              value={formData.codigo}
              onChange={(e) => handleChange('codigo', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Nombre"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="NIT"
              value={formData.nit}
              onChange={(e) => handleChange('nit', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Código REU"
              value={formData.codigoREU}
              onChange={(e) => handleChange('codigoREU', e.target.value)}
              size="small"
              fullWidth
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.estado}
                label="Estado"
                onChange={(e) => handleChange('estado', e.target.value as string)}
              >
                {ESTADOS.map((e) => (
                  <MenuItem key={e} value={e}>
                    {e}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Calificación (1-5)"
              type="number"
              value={formData.calificacion}
              onChange={(e) => handleChange('calificacion', e.target.value)}
              size="small"
              fullWidth
              inputProps={{ min: 1, max: 5 }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Condición de Pago</InputLabel>
              <Select
                value={formData.condicionPago}
                label="Condición de Pago"
                onChange={(e) => handleChange('condicionPago', e.target.value as string)}
              >
                <MenuItem value="">
                  <em>Seleccione...</em>
                </MenuItem>
                {CONDICIONES_PAGO.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Descuento Habitual %"
              type="number"
              value={formData.descuentoHabitual}
              onChange={(e) => handleChange('descuentoHabitual', e.target.value)}
              size="small"
              fullWidth
            />

            <TextField
              label="Contacto Nombre"
              value={formData.contactoNombre}
              onChange={(e) => handleChange('contactoNombre', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Contacto Teléfono"
              value={formData.contactoTelefono}
              onChange={(e) => handleChange('contactoTelefono', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Contacto Email"
              value={formData.contactoEmail}
              onChange={(e) => handleChange('contactoEmail', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Contrato Vigente"
              value={formData.contratoVigente}
              onChange={(e) => handleChange('contratoVigente', e.target.value)}
              size="small"
              fullWidth
            />

            <TextField
              type="date"
              value={formData.fechaVencimientoContrato}
              onChange={(e) => handleChange('fechaVencimientoContrato', e.target.value)}
              size="small"
              fullWidth
              placeholder="Fecha Vencimiento Contrato"
            />

            <TextField
              label="Cuenta Bancaria CUP"
              value={formData.cuentaBancariaCUP}
              onChange={(e) => handleChange('cuentaBancariaCUP', e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              label="Cuenta Bancaria MLC"
              value={formData.cuentaBancariaMLC}
              onChange={(e) => handleChange('cuentaBancariaMLC', e.target.value)}
              size="small"
              fullWidth
            />

            <TextField
              label="Empresa (ID)"
              value={formData.empresa}
              onChange={(e) => handleChange('empresa', e.target.value)}
              size="small"
              fullWidth
              helperText="ID de la empresa"
            />
            <TextField
              label="Tipo (ID)"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              size="small"
              fullWidth
              helperText="ID del tipo de proveedor"
            />
            <TextField
              label="Moneda Preferida (ID)"
              value={formData.monedaPreferida}
              onChange={(e) => handleChange('monedaPreferida', e.target.value)}
              size="small"
              fullWidth
              helperText="ID de la moneda"
            />
            <TextField
              label="Tipo Contrato (ID)"
              value={formData.tipoContrato}
              onChange={(e) => handleChange('tipoContrato', e.target.value)}
              size="small"
              fullWidth
              helperText="ID del tipo de contrato"
            />
            <TextField
              label="Categorías Producto (IDs separados por coma)"
              value={formData.categoriasProducto}
              onChange={(e) => handleChange('categoriasProducto', e.target.value)}
              size="small"
              fullWidth
            />

            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <TextField
                label="Notas"
                value={formData.notas}
                onChange={(e) => handleChange('notas', e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleGuardar}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #2e7d32 100%)',
              color: '#fff',
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
            }}
          >
            Guardar
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelar}
            sx={{ textTransform: 'none', fontWeight: 600, px: 4 }}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DataGrid a todo ancho ── */}
      <Card elevation={2} sx={{ width: '100%', flex: 1 }}>
        <CustomDataGridR
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row: Proveedor) => row._id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25, page: 0 } },
          }}
          onRowClick={(params: { row: Proveedor }) => setSelectedRow(params.row)}
        />
      </Card>
    </Box>
  );
}