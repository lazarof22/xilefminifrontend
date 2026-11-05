// src/utils/claveIdempotencia.ts
//
// Clave de idempotencia de un cobro (cabecera `Idempotency-Key` de POST /venta/checkout).
//
// Regla: UNA clave por operación, no por intento.
//  · mismos datos  → misma clave  (reintentar tras un corte de red no vende dos veces)
//  · datos distintos → clave nueva (otro carrito u otra forma de pago es otra venta;
//    reusar la clave daría un 422 "la clave ya se usó con otros datos")
//  · venta registrada → se libera, y la siguiente venta, aunque sea idéntica, lleva clave nueva
// `estimado` (los totales que vio el cajero) no cuenta: no cambia la operación.

/** UUID v4. `crypto.randomUUID` solo existe en contextos seguros (https o localhost); una red local con http no lo tiene. */
export function nuevaClave(): string {
    const c: Crypto | undefined = typeof crypto === 'undefined' ? undefined : crypto;

    if (c && typeof c.randomUUID === 'function') return c.randomUUID();

    const bytes = new Uint8Array(16);
    if (c && typeof c.getRandomValues === 'function') {
        c.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40; // versión 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** JSON con las claves ordenadas y sin `undefined`: el mismo contenido da siempre el mismo texto. */
export function canonico(valor: unknown): string {
    if (Array.isArray(valor)) return `[${valor.map((v) => canonico(v === undefined ? null : v)).join(',')}]`;

    if (valor !== null && typeof valor === 'object') {
        const objeto = valor as Record<string, unknown>;
        const partes = Object.keys(objeto)
            .filter((k) => objeto[k] !== undefined)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonico(objeto[k])}`);
        return `{${partes.join(',')}}`;
    }

    return JSON.stringify(valor) ?? 'null';
}

export class ClaveIdempotencia {
    private huella: string | null = null;
    private clave: string | null = null;

    /** La clave de esta operación: la misma mientras los datos no cambien. */
    para(solicitud: object): string {
        const operacion: Record<string, unknown> = { ...solicitud };
        delete operacion.estimado;
        const huella = canonico(operacion);

        if (this.clave === null || this.huella !== huella) {
            this.huella = huella;
            this.clave = nuevaClave();
        }

        return this.clave;
    }

    /** Hay una clave en uso (la operación no ha terminado). */
    get activa(): boolean {
        return this.clave !== null;
    }

    /** La operación terminó (o la clave ya no sirve): la próxima venta llevará una clave nueva. */
    liberar(): void {
        this.huella = null;
        this.clave = null;
    }
}
