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
