export interface DetalleCampo {
  campo: string;
  mensaje: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalles?: unknown;

  constructor(status: number, codigo: string, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Errores por campo (400 VALIDACION) listos para pintar en el formulario. */
  get porCampo(): Record<string, string> {
    if (this.codigo !== "VALIDACION" || !Array.isArray(this.detalles)) return {};
    const salida: Record<string, string> = {};
    for (const d of this.detalles as DetalleCampo[]) salida[d.campo] ??= d.mensaje;
    return salida;
  }

  get idExistente(): string | null {
    const d = this.detalles as { idExistente?: string } | undefined;
    return this.codigo === "DUPLICADO" && d?.idExistente ? d.idExistente : null;
  }
}

export interface Respuesta<T, M = undefined> {
  data: T;
  meta: M;
}

export async function pedir<T, M = undefined>(
  ruta: string,
  init: { metodo?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<Respuesta<T, M>> {
  let res: Response;
  try {
    res = await fetch(`/api${ruta}`, {
      method: init.metodo ?? "GET",
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "RED", "No se pudo conectar con el servidor. Revisá que el backend esté en marcha.");
  }

  if (res.status === 204) return { data: undefined as T, meta: undefined as M };

  let json: { data?: T; meta?: M; error?: { codigo: string; mensaje: string; detalles?: unknown } };
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, "RESPUESTA_INVALIDA", "El servidor devolvió una respuesta inesperada.");
  }
  if (!res.ok || json.error) {
    const e = json.error;
    throw new ApiError(res.status, e?.codigo ?? "ERROR", e?.mensaje ?? "Ocurrió un error inesperado.", e?.detalles);
  }
  return { data: json.data as T, meta: json.meta as M };
}
