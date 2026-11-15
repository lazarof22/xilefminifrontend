// src/utils/permisos.ts
//
// Roles que el backend acepta en cada operación. Sirven SOLO para no mostrar botones que el servidor
// rechazaría con 403: la autorización real siempre la decide el servidor.
// (`puedeAjustarInventario` vive en service/ajusteInventarioApi.ts.)

type Rol = string | undefined | null;

const esAlguno = (rol: Rol, permitidos: readonly string[]): boolean => !!rol && permitidos.includes(rol);

/** POST /devolucion (Vale SC-2-08). */
export const puedeDevolverVenta = (rol: Rol): boolean => esAlguno(rol, ['administrador', 'gerente']);

/** POST /recepcion (Informe de Recepción SC-2-04). */
export const puedeRegistrarRecepcion = (rol: Rol): boolean =>
    esAlguno(rol, ['administrador', 'gerente', 'economico']);

/** Abrir y cerrar turno de caja (POST /turno-caja/...). */
export const puedeGestionarTurnoCaja = (rol: Rol): boolean => esAlguno(rol, ['cajero', 'administrador']);

/** Crear, editar, terminar y confirmar facturas (POST/PATCH /facturas). */
export const puedeEditarFactura = (rol: Rol): boolean =>
    esAlguno(rol, ['administrador', 'gerente', 'facturador']);

/** Cancelar, anular o dar de baja una factura (PATCH :id/cancelar, :id/anular, DELETE :id). */
export const puedeAnularFactura = (rol: Rol): boolean => esAlguno(rol, ['administrador', 'gerente']);

/** Facturar a un precio distinto al del producto; los demás roles usan siempre el precio de venta. */
export const puedeModificarPrecioFactura = (rol: Rol): boolean => esAlguno(rol, ['administrador', 'gerente']);

/** Leer bancos, denominaciones y fichas normativas desde Configuración (pestañas de solo lectura o edición). */
export const puedeVerNomencladoresPago = (rol: Rol): boolean =>
    esAlguno(rol, ['administrador', 'gerente', 'economico']);

/** Asignar la condición "cliente con descuento" (el servidor responde 403 a los demás roles). */
export const puedeAsignarDescuentoCliente = (rol: Rol): boolean => esAlguno(rol, ['administrador', 'gerente']);

/** POST/PATCH /banco y /denominacion-moneda: el servidor solo acepta administrador y gerente. */
export const puedeEditarNomencladoresPago = (rol: Rol): boolean => esAlguno(rol, ['administrador', 'gerente']);

/**
 * Texto para el usuario cuando el servidor rechaza una operación por rol (403, "Forbidden resource"):
 * deja el mensaje del servidor intacto en los demás errores.
 */
export const mensajeSinPermiso = (mensaje: string): string =>
    /^(forbidden( resource)?|error http 403)\.?$/i.test(mensaje.trim()) ? 'Su rol no tiene permiso para realizar esta operación.' : mensaje;
