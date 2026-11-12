import type { Catalogos, Componente, DatosFormulario } from "../types";
import { hoyISO } from "./format";

/** Valores del formulario tal como los escribe la persona (todo texto, salvo favorito). */
export interface Campos {
  nombre: string;
  categoria: string;
  descripcion: string;
  valor: string;
  cantidad: string;
  unidad: string;
  ubicacion: string;
  fabricante: string;
  fechaIncorporacion: string;
  favorito: boolean;
}

export type Errores = Partial<Record<keyof Campos, string>>;

export function camposVacios(): Campos {
  return {
    nombre: "",
    categoria: "",
    descripcion: "",
    valor: "",
    cantidad: "",
    unidad: "unidades",
    ubicacion: "",
    fabricante: "",
    fechaIncorporacion: hoyISO(),
    favorito: false,
  };
}

export function camposDe(c: Componente): Campos {
  return { ...c, cantidad: String(c.cantidad) };
}

/** Acepta coma o punto decimal. Devuelve NaN si no es un número. */
export function leerCantidad(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  return limpio === "" ? NaN : Number(limpio);
}

const limpiar = (t: string) => t.replace(/\s+/g, " ").trim();

/**
 * Validación inmediata para guiar a la persona. Es solo experiencia de usuario:
 * la fuente de verdad es el backend, que vuelve a validar todo.
 */
export function validar(c: Campos, cat: Catalogos): Errores {
  const e: Errores = {};
  const nombre = limpiar(c.nombre);
  if (!nombre) e.nombre = "Campo obligatorio";
  else if (nombre.length < 2) e.nombre = "Debe tener al menos 2 caracteres";
  else if (nombre.length > 80) e.nombre = "Máximo 80 caracteres";

  if (!c.categoria) e.categoria = "Elegí una categoría";
  else if (!cat.categorias.includes(c.categoria)) e.categoria = "Categoría inválida";

  if (!cat.unidades.includes(c.unidad)) e.unidad = "Elegí una unidad";

  if (limpiar(c.descripcion).length > 300) e.descripcion = "Máximo 300 caracteres";
  if (limpiar(c.valor).length > 40) e.valor = "Máximo 40 caracteres";
  if (limpiar(c.fabricante).length > 80) e.fabricante = "Máximo 80 caracteres";

  const ubicacion = limpiar(c.ubicacion);
  if (!ubicacion) e.ubicacion = "Campo obligatorio";
  else if (ubicacion.length > 80) e.ubicacion = "Máximo 80 caracteres";

  const cantidad = leerCantidad(c.cantidad);
  if (c.cantidad.trim() === "") e.cantidad = "Campo obligatorio";
  else if (!Number.isFinite(cantidad)) e.cantidad = "Ingresá un número";
  else if (cantidad < 0) e.cantidad = "No puede ser negativa";
  else if (c.unidad === "unidades" && !Number.isInteger(cantidad)) {
    e.cantidad = 'Debe ser entero cuando la unidad es "unidades"';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fechaIncorporacion)) e.fechaIncorporacion = "Fecha inválida";
  else if (c.fechaIncorporacion > hoyISO()) e.fechaIncorporacion = "No puede ser una fecha futura";

  return e;
}

export function aDatos(c: Campos): DatosFormulario {
  return {
    nombre: limpiar(c.nombre),
    categoria: c.categoria,
    descripcion: limpiar(c.descripcion),
    valor: limpiar(c.valor),
    cantidad: leerCantidad(c.cantidad),
    unidad: c.unidad,
    ubicacion: limpiar(c.ubicacion),
    fabricante: limpiar(c.fabricante),
    fechaIncorporacion: c.fechaIncorporacion,
    favorito: c.favorito,
  };
}
