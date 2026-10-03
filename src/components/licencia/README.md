# Módulo de licencia (frontend)

Pantalla `/licencia` (`src/pages/configuracion/Licencia.tsx`). El servidor es la única
autoridad: el frontend no valida firmas, no calcula identificadores de equipo y no
interpreta el formato de las claves. Solo comprueba que el `.lic` sea JSON con la forma
esperada antes de enviarlo.

## Estructura

| Archivo | Rol |
| --- | --- |
| `src/pages/configuracion/Licencia.tsx` | Contenedor: carga de datos, acciones, notificaciones |
| `src/components/licencia/KpisLicencia.tsx` | Fila de KPIs (estado, vencimiento, días, usuarios) |
| `src/components/licencia/EstadoLicenciaCard.tsx` | Estado detallado de la licencia instalada |
| `src/components/licencia/ActivacionLicencia.tsx` | Stepper de activación offline (3 pasos) |
| `src/components/licencia/ZonaArchivoLicencia.tsx` | Zona accesible para soltar/seleccionar el `.lic` |
| `src/components/licencia/VistaPreviaArtefacto.tsx` | Resumen del `.lic` antes de enviarlo |
| `src/components/licencia/ConfirmarRevocacionDialog.tsx` | Confirmación obligatoria para revocaciones |
| `src/service/licenciaApi.ts` | Cliente HTTP (`fetch`, token `Bearer` de `localStorage`) |
| `src/types/licencia.types.ts` | Tipos del contrato |
| `src/utils/licencia.ts` | Helpers puros: lectura del `.lic`, textos de estado, fechas, selección de licencia |
| `src/utils/auth.ts` | Token en `localStorage` y lectura **no autoritativa** del payload del JWT |

## Flujo de activación offline

1. **Generar solicitud**: `GET /licencia/solicitud?descargar=true` descarga `xilef-<empresa>.req`.
   El identificador del equipo lo calcula el servidor.
2. **Enviar a XILEF**: el cliente envía el `.req` y recibe un `.lic` firmado.
3. **Importar licencia**: se lee el `.lic`, se muestra un resumen y se envía tal cual a
   `POST /licencia/activar`. Un `.lic` con `revocada: true` exige confirmación previa.
   El resultado (`activada`, `actualizada`, `revocada`, `reimportada`) se muestra al usuario.

## Endpoints

Base: `VITE_API_URL` (por defecto `http://localhost:3000`), sin prefijo `/api`.

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/licencia/public/estado` | Público |
| GET | `/licencia/estado` | Usuario autenticado |
| GET | `/licencia` | Administrador (lista de licencias) |
| GET | `/licencia/:empresaId` | Administrador (una licencia o `null`) |
| GET | `/licencia/solicitud?descargar=true` | Administrador |
| POST | `/licencia/activar` | Administrador |

## Detalle de administrador

Si el JWT contiene `empresa_id`, la página pide `GET /licencia/:empresaId`. Si no, pide
`GET /licencia` (un array) y muestra la licencia válida o, si no hay, la importada más
recientemente. El payload del JWT se decodifica en el cliente sin verificar la firma: solo
decide qué ruta llamar; la autorización la aplica el servidor.

Con firma inválida el backend envía `null` en los datos del payload (`fecha_inicio`,
`max_usuarios`, `secuencia`, `emitida_en`, `activa`, `revocada`, etc.); la interfaz los
muestra como "—".

Sin token o sin rol de administrador (401/403 sin `codigo`) la página muestra el estado
público y el aviso "Inicia sesión como administrador para gestionar la licencia".
Los rechazos (`codigo` en la respuesta) se traducen en `src/utils/licencia.ts`.
