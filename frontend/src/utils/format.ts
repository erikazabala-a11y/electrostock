export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export function formatearCantidad(n: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n);
}

/** Singular simple para la unidad cuando la cantidad es 1. */
export function unidadVisible(unidad: string, cantidad: number): string {
  if (cantidad !== 1) return unidad;
  return { unidades: "unidad", metros: "metro", rollos: "rollo", paquetes: "paquete" }[unidad] ?? unidad;
}
