// ═══ Roles y módulos de la aplicación (espejo de auth/schemas/usuarios.schema.ts) ═══

export type UsuarioRol =
    | 'administrador'
    | 'empleado'
    | 'jefe'
    | 'facturador'
    | 'cajero'
    | 'gerente'
    | 'economico';

export const ROLES: { value: UsuarioRol; label: string }[] = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'empleado', label: 'Empleado' },
    { value: 'jefe', label: 'Jefe' },
    { value: 'facturador', label: 'Facturador' },
    { value: 'cajero', label: 'Cajero' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'economico', label: 'Económico' },
];

export const ROL_ADMIN: UsuarioRol = 'administrador';

export const etiquetaRol = (rol: string): string =>
    ROLES.find((r) => r.value === rol)?.label ?? rol;

export type ModuloApp =
    | 'dashboard'
    | 'inventario'
    | 'ventas'
    | 'compras'
    | 'tasas'
    | 'punto_venta'
    | 'clientes'
    | 'configuracion'
    | 'licencia';

/** El `value` coincide con la ruta del frontend (`/${value}`). */
export const MODULOS: { value: ModuloApp; label: string }[] = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'inventario', label: 'Inventario' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'compras', label: 'Compras' },
    { value: 'tasas', label: 'Tasas' },
    { value: 'punto_venta', label: 'Punto de Venta' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'configuracion', label: 'Configuración' },
    { value: 'licencia', label: 'Licencia' },
];

/** Usuario tal y como lo lista `GET /usuarios`. */
export interface UsuarioBackend {
    _id: string;
    nombre: string;
    rol: UsuarioRol;
    /** Módulos efectivos (todos si es administrador). */
    modulos: ModuloApp[];
    createdAt?: string;
}

export interface NuevoUsuarioDto {
    nombre: string;
    contraseña: string;
    rol: UsuarioRol;
    modulos: ModuloApp[];
}

export type ActualizarUsuarioDto = Partial<NuevoUsuarioDto>;
