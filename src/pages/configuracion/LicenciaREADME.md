# API de Licencias — Especificación para el Backend

Este documento describe **qué endpoints debe implementar el backend** para que el
frontend `Licencia.tsx` (XILEF) funcione. No es necesario entender el código del
frontend: con implementar estos dos endpoints bajo el prefijo `/api` es suficiente.

---

## 1. Obtener el Código Identificador de la máquina

**Endpoint:** `GET /api/licencia/codigoid`

**Autenticación:** opcional (el endpoint se llama al cargar la pantalla de
Licencia, posiblemente antes de que exista un token de sesión). Si el token no
existe, el frontend lo envía sin header `Authorization` — el backend no debe
rechazar la petición por falta de token.

### Qué debe hacer el backend

1. Leer el **número de serie de los componentes de la computadora** donde corre
   el backend (CPU, placa madre, disco duro, tarjeta de red/MAC, etc.).
2. Generar un **código identificador** determinístico a partir de esos seriales
   (misma máquina → mismo código siempre).
3. Devolverlo en la respuesta.

### Respuesta esperada (JSON)

```json
{
  "success": true,
  "codigo": "XILEF-8F3A-21BC-90DE"
}
```

| Campo     | Tipo    | Descripción                                                        |
|-----------|---------|--------------------------------------------------------------------|
| `success` | boolean | `true` si se pudo generar el código, `false` si hubo algún fallo   |
| `codigo`  | string  | El código identificador de la máquina (vacío o omitido si falló)   |

**Contrato del frontend:** si `success === true` muestra el `codigo` en el campo
*Generador de Código Identificador*. Si `success === false` o la petición falla
(servidor caído, timeout, error HTTP), muestra un snackbar con el mensaje de
error ("No conectado…" o el `message` devuelto).

---

## 2. Activar Licencia

**Endpoint:** `POST /api/licencia/activar`

**Autenticación:** igual que arriba (el frontend envía el token si existe).

### Body (JSON)

```json
{
  "clave_activacion": "CLAVE-COPIADA-POR-EL-USUARIO",
  "empresa_nombre": "",
  "empresa_id": ""
}
```

| Campo              | Tipo   | Descripción                                                     |
|--------------------|--------|-----------------------------------------------------------------|
| `clave_activacion` | string | **Obligatoria.** Clave que el usuario copió del código identificador y pegó en el campo *Clave de Activación*. |
| `empresa_nombre`   | string | Nombre de la empresa (puede venir vacío).                       |
| `empresa_id`       | string | RUC/NIT de la empresa (puede venir vacío).                      |

### Respuesta esperada

- **Éxito (HTTP 200):**
  ```json
  { "message": "Licencia activada correctamente" }
  ```
- **Error (HTTP 4xx/5xx):** el frontend lee el campo `message` del JSON y lo
  muestra en un snackbar de error:
  ```json
  { "message": "Clave de activación inválida" }
  ```

**Validaciones mínimas recomendadas:** clave vacía → 400, clave no registrada →
400/404, clave ya usada o vencida → 400 con mensaje descriptivo.

---

## Flujo completo (resumen)

1. El usuario abre **Licencia** en el frontend.
2. El frontend llama `GET /api/licencia/codigoid` → el backend genera el código
   a partir del serial del hardware y lo devuelve.
3. El frontend muestra el código en *Generador de Código Identificador* (campo
   de solo lectura con botón de copiar).
4. El usuario copia el código y lo pega en *Clave de Activación*.
5. El usuario pulsa **Activar Licencia** → el frontend hace
   `POST /api/licencia/activar` con la clave.
6. El backend valida la clave contra la licencia registrada y responde éxito o
   error; el frontend lo muestra en un snackbar.

---

## Ejemplo de implementación (Node.js / NestJS) — generación del código

El código debe ser **determinístico**: derivado de los seriales del hardware, de
forma que la misma máquina siempre genere el mismo código. Ejemplo con
`node-machine-id` (instalar con `npm install node-machine-id`) más un hash corto
y legible:

```ts
import { machineIdSync } from 'node-machine-id';
import { createHash } from 'crypto';

// machineIdSync() devuelve un identificador único de la máquina
// (derivado del serial del hardware / MachineGuid de Windows).
function generarCodigoIdentificador(): string {
  const id = machineIdSync(); // mismo hardware -> mismo valor siempre
  const hash = createHash('sha256').update(id).digest('hex').toUpperCase();

  // Formato legible: XILEF-XXXX-XXXX-XXXX
  return [
    'XILEF',
    hash.slice(0, 4),
    hash.slice(4, 8),
    hash.slice(8, 12),
  ].join('-');
}
```

Alternativa sin dependencias (Windows, vía PowerShell / `wmic`):

```ts
import { execSync } from 'child_process';

function obtenerSerialHardware(): string {
  const cpu = execSync('wmic cpu get ProcessorId /value').toString();
  const board = execSync('wmic baseboard get SerialNumber /value').toString();
  const disk = execSync('wmic diskdrive get SerialNumber /value').toString();
  return (cpu + board + disk).replace(/[^\w]/g, '');
}
```

> Nota: en Windows moderno `wmic` está deprecado; se puede usar
> `powershell -Command "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId"`.

El resultado se hashea igual que en el ejemplo anterior para producir el código
final.

---

## Endpoints legacy (ya no los usa este frontend)

Los siguientes endpoints existían en versiones anteriores y **ya no son
necesarios** para `Licencia.tsx` actual: `GET /api/licencia`,
`POST /api/licencia/generar`, `POST /api/licencia/renovar`. Pueden mantenerse
para otros módulos o eliminarse si nadie más los consume.
