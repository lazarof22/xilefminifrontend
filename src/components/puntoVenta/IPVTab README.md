# Backend requerido para `IPVTab.tsx`

## 1. Descripción

`IPVTab.tsx` es el módulo encargado de mostrar y gestionar la **IPV (Inventario, Productos y Ventas)**.

El frontend necesita que el backend proporcione la información de los productos y, si se desea persistir la información de IPV en el servidor, endpoints para consultar, guardar, actualizar y reiniciar los datos de la IPV.

> **Importante:** la versión actual de `IPVTab.tsx` utiliza `localStorage` con la clave `ipv_tabla` para guardar temporalmente la información.
> El backend puede sustituir esta persistencia para que los datos sean compartidos entre usuarios/dispositivos y permanezcan almacenados en la base de datos.

---

# 2. Datos que necesita `IPVTab.tsx`

El componente recibe mediante props:

```ts
interface IPVTabProps {
    productos: ProductoIPV[];
}
```

Cada producto debe tener como mínimo:

```ts
export interface ProductoIPV {
    _id: string;
    codigo_producto: string;
    nombre_producto: string;
    categoria_producto: string;
    precio_compra: number;
    precio_venta: number;
    stock_inicial: number;
    stock_minimo: number;
    estado: string;
}
```

## Ejemplo

```json
{
    "_id": "68c123456789",
    "codigo_producto": "PROD-001",
    "nombre_producto": "Queso Artesanal",
    "categoria_producto": "Lácteos",
    "precio_compra": 5.50,
    "precio_venta": 8.00,
    "stock_inicial": 25,
    "stock_minimo": 5,
    "estado": "activo"
}
```

---

# 3. Endpoint de productos

El frontend necesita un endpoint que devuelva los productos que serán utilizados por la IPV.

### `GET /api/productos`

### Respuesta esperada

Puede devolver directamente un array:

```json
[
    {
        "_id": "68c123456789",
        "codigo_producto": "PROD-001",
        "nombre_producto": "Queso Artesanal",
        "categoria_producto": "Lácteos",
        "precio_compra": 5.50,
        "precio_venta": 8.00,
        "stock_inicial": 25,
        "stock_minimo": 5,
        "estado": "activo"
    },
    {
        "_id": "68c123456790",
        "codigo_producto": "PROD-002",
        "nombre_producto": "Orégano",
        "categoria_producto": "Especias",
        "precio_compra": 2.00,
        "precio_venta": 3.50,
        "stock_inicial": 40,
        "stock_minimo": 10,
        "estado": "activo"
    }
]
```

También puede utilizarse una respuesta envuelta:

```json
{
    "success": true,
    "data": [
        {
            "_id": "68c123456789",
            "codigo_producto": "PROD-001",
            "nombre_producto": "Queso Artesanal",
            "categoria_producto": "Lácteos",
            "precio_compra": 5.50,
            "precio_venta": 8.00,
            "stock_inicial": 25,
            "stock_minimo": 5,
            "estado": "activo"
        }
    ]
}
```

En ese caso, el servicio del frontend debe utilizar `response.data`.

---

# 4. Estructura de una fila de IPV

Una vez que el frontend recibe los productos, construye las filas de la tabla.

La estructura utilizada por `IPVTab.tsx` es:

```ts
interface IPVRow {
    id: string;
    productoId: string;

    nombreProducto: string;

    precioCosto: number;
    precioVenta: number;

    inventarioInicial: number;
    entradas: number;
    ajusteDisminucion: number;
    venta: number;

    disponible: number;
    inventarioFinal: number;

    importeVenta: number;
    importeCosto: number;
}
```

---

# 5. Campos que debe almacenar el backend

Los siguientes campos son los principales datos de la IPV que deberían persistirse:

| Campo               | Tipo     | Descripción                               |
| ------------------- | -------- | ----------------------------------------- |
| `productoId`        | `string` | ID del producto                           |
| `inventarioInicial` | `number` | Inventario con el que comienza el período |
| `entradas`          | `number` | Productos ingresados al inventario        |
| `ajusteDisminucion` | `number` | Ajustes que disminuyen el inventario      |
| `venta`             | `number` | Cantidad vendida                          |

Los siguientes valores pueden calcularse en el backend o frontend:

| Campo             | Cálculo                                            |
| ----------------- | -------------------------------------------------- |
| `disponible`      | `inventarioInicial + entradas - ajusteDisminucion` |
| `inventarioFinal` | `disponible - venta`                               |
| `importeVenta`    | `precioVenta × venta`                              |
| `importeCosto`    | `precioCosto × venta`                              |

El frontend actualmente garantiza que los valores calculados no sean negativos.

---

# 6. Endpoint para obtener la IPV

Se recomienda crear:

### `GET /api/ipv`

Este endpoint debe devolver los registros de IPV existentes.

### Respuesta recomendada

```json
{
    "success": true,
    "data": [
        {
            "_id": "ipv-001",
            "productoId": "68c123456789",
            "inventarioInicial": 25,
            "entradas": 10,
            "ajusteDisminucion": 2,
            "venta": 8
        },
        {
            "_id": "ipv-002",
            "productoId": "68c123456790",
            "inventarioInicial": 40,
            "entradas": 5,
            "ajusteDisminucion": 0,
            "venta": 12
        }
    ]
}
```

---

# 7. Endpoint para crear/guardar IPV

Para sustituir el `localStorage`, se recomienda:

### `POST /api/ipv`

### Request

```json
{
    "productoId": "68c123456789",
    "inventarioInicial": 25,
    "entradas": 10,
    "ajusteDisminucion": 2,
    "venta": 8
}
```

### Respuesta

```json
{
    "success": true,
    "message": "Registro de IPV creado correctamente.",
    "data": {
        "_id": "ipv-001",
        "productoId": "68c123456789",
        "inventarioInicial": 25,
        "entradas": 10,
        "ajusteDisminucion": 2,
        "venta": 8
    }
}
```

---

# 8. Endpoint para actualizar una IPV

Cuando el usuario utiliza la opción **Editar** del `CustomDataGridR`, el frontend puede enviar los cambios al backend.

### `PUT /api/ipv/:id`

Ejemplo:

```http
PUT /api/ipv/ipv-001
```

### Request

```json
{
    "productoId": "68c123456789",
    "inventarioInicial": 25,
    "entradas": 15,
    "ajusteDisminucion": 2,
    "venta": 10
}
```

### Respuesta

```json
{
    "success": true,
    "message": "Registro de IPV actualizado correctamente.",
    "data": {
        "_id": "ipv-001",
        "productoId": "68c123456789",
        "inventarioInicial": 25,
        "entradas": 15,
        "ajusteDisminucion": 2,
        "venta": 10
    }
}
```

---

# 9. Endpoint para eliminar una IPV

Aunque la versión actual de `IPVTab.tsx` no utiliza `deleteConfig` en `CustomDataGridR`, el `CustomDataGridR` soporta eliminación.

Si posteriormente se habilita:

```tsx
deleteConfig={{
    baseUrl: '/api/ipv'
}}
```

el backend debería soportar:

### `DELETE /api/ipv/:id`

### Respuesta

```json
{
    "success": true,
    "message": "Registro de IPV eliminado correctamente."
}
```

---

# 10. Endpoint para reiniciar la IPV

El botón:

```text
Reiniciar Datos
```

actualmente elimina:

```text
localStorage.removeItem('ipv_tabla')
```

Cuando la persistencia pase al backend, se recomienda crear un endpoint específico.

### `DELETE /api/ipv/reset`

o preferiblemente:

### `POST /api/ipv/reset`

### Request

Si la IPV pertenece a un período:

```json
{
    "periodo": "2026-09"
}
```

Si existen múltiples almacenes/sucursales:

```json
{
    "periodo": "2026-09",
    "almacenId": "almacen-001"
}
```

### Respuesta

```json
{
    "success": true,
    "message": "Datos de IPV reiniciados correctamente."
}
```

---

# 11. Cálculos de IPV

El frontend actualmente realiza los siguientes cálculos.

## Disponible en venta

```ts
disponible =
    Math.max(
        0,
        inventarioInicial +
        entradas -
        ajusteDisminucion
    );
```

Ejemplo:

```text
Inventario Inicial:       25
Entradas:                 10
Ajuste Disminución:        2
                           --
Disponible:               33
```

---

## Inventario final

```ts
inventarioFinal =
    Math.max(
        0,
        disponible - venta
    );
```

Ejemplo:

```text
Disponible:               33
Venta:                     8
                           --
Inventario Final:         25
```

---

## Importe de venta

```ts
importeVenta = precioVenta * venta;
```

Ejemplo:

```text
Precio Venta:             8.00
Cantidad Vendida:            8
                           ---
Importe Venta:            64.00
```

---

## Importe de costo

```ts
importeCosto = precioCosto * venta;
```

Ejemplo:

```text
Precio Costo:             5.50
Cantidad Vendida:            8
                           ---
Importe Costo:            44.00
```

---

# 12. Respuesta completa recomendada

Si el backend quiere simplificar el trabajo del frontend, puede devolver directamente todos los valores calculados:

```json
{
    "success": true,
    "data": [
        {
            "_id": "ipv-001",
            "productoId": "68c123456789",

            "nombreProducto": "Queso Artesanal",

            "precioCosto": 5.50,
            "precioVenta": 8.00,

            "inventarioInicial": 25,
            "entradas": 10,
            "ajusteDisminucion": 2,
            "venta": 8,

            "disponible": 33,
            "inventarioFinal": 25,

            "importeVenta": 64.00,
            "importeCosto": 44.00
        }
    ]
}
```

Sin embargo, **el backend debería considerar como datos fuente**:

```text
productoId
inventarioInicial
entradas
ajusteDisminucion
venta
```

y generar los valores calculados a partir de ellos.

---

# 13. Validaciones necesarias en el backend

El backend debe validar que los valores numéricos sean válidos.

### No permitir

```json
{
    "venta": -10
}
```

### No permitir

```json
{
    "entradas": "hola"
}
```

### Recomendación

Todos estos campos deben ser números mayores o iguales a `0`:

```text
inventarioInicial
entradas
ajusteDisminucion
venta
precioCosto
precioVenta
```

Además:

```text
inventarioFinal >= 0
disponible >= 0
importeVenta >= 0
importeCosto >= 0
```

---

# 14. Relación entre Producto e IPV

La relación recomendada en base de datos es:

```text
Producto
   │
   │ 1
   │
   ▼
IPV
```

Un registro IPV debe guardar el ID del producto:

```json
{
    "productoId": "68c123456789"
}
```

No es recomendable duplicar toda la información del producto dentro de IPV.

El backend puede obtener:

```text
productoId
      ↓
Producto
      ↓
nombre_producto
precio_compra
precio_venta
```

---

# 15. Modelo de datos recomendado

Por ejemplo, utilizando MongoDB/Mongoose:

```ts
const IPVSchema = new Schema(
    {
        productoId: {
            type: Schema.Types.ObjectId,
            ref: 'Producto',
            required: true
        },

        inventarioInicial: {
            type: Number,
            required: true,
            min: 0
        },

        entradas: {
            type: Number,
            default: 0,
            min: 0
        },

        ajusteDisminucion: {
            type: Number,
            default: 0,
            min: 0
        },

        venta: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);
```

---

# 16. Período de la IPV

Para un sistema real de inventario es recomendable que la IPV pertenezca a un período.

Por ejemplo:

```json
{
    "productoId": "68c123456789",
    "periodo": "2026-09",
    "inventarioInicial": 25,
    "entradas": 10,
    "ajusteDisminucion": 2,
    "venta": 8
}
```

También puede utilizarse:

```json
{
    "fechaInicio": "2026-09-01",
    "fechaFin": "2026-09-30"
}
```

Esto permite mantener históricos:

```text
IPV Septiembre 2026
IPV Octubre 2026
IPV Noviembre 2026
...
```

en lugar de sobrescribir siempre los mismos datos.

---

# 17. Flujo recomendado

El flujo completo sería:

```text
                    ┌──────────────────┐
                    │     Producto     │
                    └────────┬─────────┘
                             │
                             │ GET /api/productos
                             ▼
                    ┌──────────────────┐
                    │    IPVTab.tsx    │
                    └────────┬─────────┘
                             │
                  ┌──────────┴──────────┐
                  │                     │
                  ▼                     ▼
             Mostrar IPV          Calcular valores
                  │                     │
                  │                     ├─ Disponible
                  │                     ├─ Inventario Final
                  │                     ├─ Importe Venta
                  │                     └─ Importe Costo
                  │
                  ▼
             Editar registro
                  │
                  ▼
            PUT /api/ipv/:id
                  │
                  ▼
              Backend
                  │
                  ▼
              Database
```

---

# 18. Endpoints finales recomendados

| Método   | Endpoint         | Función               |
| -------- | ---------------- | --------------------- |
| `GET`    | `/api/productos` | Obtener productos     |
| `GET`    | `/api/ipv`       | Obtener registros IPV |
| `GET`    | `/api/ipv/:id`   | Obtener una IPV       |
| `POST`   | `/api/ipv`       | Crear IPV             |
| `PUT`    | `/api/ipv/:id`   | Actualizar IPV        |
| `DELETE` | `/api/ipv/:id`   | Eliminar IPV          |
| `POST`   | `/api/ipv/reset` | Reiniciar IPV         |

---

# 19. Códigos HTTP esperados

### Operación correcta

```text
200 OK
```

o para creación:

```text
201 Created
```

### Datos incorrectos

```text
400 Bad Request
```

Ejemplo:

```json
{
    "success": false,
    "message": "El campo venta debe ser un número mayor o igual a 0."
}
```

### No autorizado

```text
401 Unauthorized
```

### Sin permisos

```text
403 Forbidden
```

### Registro no encontrado

```text
404 Not Found
```

### Error del servidor

```text
500 Internal Server Error
```

---

# 20. Resumen del contrato Backend ↔ Frontend

El backend debe proporcionar principalmente:

```text
PRODUCTOS
│
├── _id
├── codigo_producto
├── nombre_producto
├── categoria_producto
├── precio_compra
├── precio_venta
├── stock_inicial
├── stock_minimo
└── estado


IPV
│
├── productoId
├── inventarioInicial
├── entradas
├── ajusteDisminucion
└── venta
```

Y el frontend puede obtener:

```text
disponible
inventarioFinal
importeVenta
importeCosto
```

mediante los cálculos correspondientes.

La implementación actual de `IPVTab.tsx` funciona sin backend de IPV porque utiliza:

```ts
localStorage.setItem('ipv_tabla', ...)
```

pero para una implementación definitiva se recomienda reemplazar esa persistencia por:

```text
GET    /api/ipv
POST   /api/ipv
PUT    /api/ipv/:id
DELETE /api/ipv/:id
POST   /api/ipv/reset
```

manteniendo `/api/productos` como fuente de los productos.

---

# 21. Consideración importante para la integración actual

`CustomDataGridR` es responsable de mostrar y editar las filas mediante su diálogo de edición.

Por ello, `IPVTab.tsx` debe encargarse de:

1. Recibir los productos.
2. Construir las filas IPV.
3. Recalcular los campos derivados.
4. Enviar los cambios al backend.
5. Actualizar el estado local después de una operación exitosa.
6. Mostrar los mensajes de éxito/error.

`CustomDataGridR` no necesita conocer la lógica específica de IPV.

La lógica de negocio permanece en:

```text
IPVTab.tsx
     │
     ├── inventarioInicial
     ├── entradas
     ├── ajusteDisminucion
     ├── venta
     │
     ├── disponible
     ├── inventarioFinal
     ├── importeVenta
     └── importeCosto
```

Esto permite mantener `CustomDataGridR` como un componente genérico y reutilizable para otras tablas del sistema.
