import {
  CATEGORIAS,
  UNIDADES,
  errorDeCantidad,
  type Categoria,
  type DatosComponente,
  type Unidad,
} from '../domain/componente.ts';
import { ValidationError, type DetalleCampo } from '../errors.ts';

type Cuerpo = Record<string, unknown>;

const CANTIDAD_MAXIMA = 1_000_000_000;

export function esObjeto(valor: unknown): valor is Cuerpo {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function leerTexto(
  body: Cuerpo,
  campo: string,
  errores: DetalleCampo[],
  { obligatorio, min = 0, max }: { obligatorio: boolean; min?: number; max: number },
): string {
  const crudo = body[campo];
  if (crudo === undefined || crudo === null) {
    if (obligatorio) errores.push({ campo, mensaje: 'Campo obligatorio' });
    return '';
  }
  if (typeof crudo !== 'string') {
    errores.push({ campo, mensaje: 'Debe ser texto' });
    return '';
  }
  const texto = crudo.replace(/\s+/g, ' ').trim();
  if (texto === '') {
    if (obligatorio) errores.push({ campo, mensaje: 'Campo obligatorio' });
    return '';
  }
  if (texto.length < min) errores.push({ campo, mensaje: `Debe tener al menos ${min} caracteres` });
  else if (texto.length > max) errores.push({ campo, mensaje: `Debe tener como máximo ${max} caracteres` });
  return texto;
}

function leerOpcion<T extends string>(
  body: Cuerpo,
  campo: string,
  opciones: readonly T[],
  errores: DetalleCampo[],
): T | undefined {
  const crudo = body[campo];
  if (crudo === undefined || crudo === null || crudo === '') {
    errores.push({ campo, mensaje: 'Campo obligatorio' });
    return undefined;
  }
  const encontrada = opciones.find((o) => o === crudo);
  if (!encontrada) {
    errores.push({ campo, mensaje: `Debe ser una de: ${opciones.join(', ')}` });
  }
  return encontrada;
}

/** Devuelve el número o undefined si ya registró el error. */
function leerNumero(body: Cuerpo, campo: string, errores: DetalleCampo[]): number | undefined {
  const crudo = body[campo];
  if (crudo === undefined || crudo === null || crudo === '') {
    errores.push({ campo, mensaje: 'Campo obligatorio' });
    return undefined;
  }
  if (typeof crudo !== 'number' || !Number.isFinite(crudo)) {
    errores.push({ campo, mensaje: 'Debe ser un número' });
    return undefined;
  }
  return crudo;
}

/** RN6: formato YYYY-MM-DD, fecha real y no futura. */
export function errorDeFecha(valor: string, hoy: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return 'Formato inválido, usá AAAA-MM-DD';
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const real =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  if (!real) return 'La fecha no existe';
  if (valor > hoy) return 'No puede ser una fecha futura';
  return null;
}

/**
 * Valida un componente completo (alta, edición o ítem de importación).
 * Acumula TODOS los errores. Ignora `id` y `estado` si el cliente los manda.
 */
export function validarComponente(body: unknown, hoy: string): DatosComponente {
  if (!esObjeto(body)) {
    throw new ValidationError([{ campo: 'body', mensaje: 'Se esperaba un objeto JSON' }]);
  }
  const errores: DetalleCampo[] = [];

  const nombre = leerTexto(body, 'nombre', errores, { obligatorio: true, min: 2, max: 80 });
  const categoria = leerOpcion<Categoria>(body, 'categoria', CATEGORIAS, errores);
  const descripcion = leerTexto(body, 'descripcion', errores, { obligatorio: false, max: 300 });
  const valor = leerTexto(body, 'valor', errores, { obligatorio: false, max: 40 });
  const unidad = leerOpcion<Unidad>(body, 'unidad', UNIDADES, errores);
  const ubicacion = leerTexto(body, 'ubicacion', errores, { obligatorio: true, max: 80 });
  const fabricante = leerTexto(body, 'fabricante', errores, { obligatorio: false, max: 80 });

  const cantidad = leerNumero(body, 'cantidad', errores);
  if (cantidad !== undefined) {
    const problema =
      cantidad > CANTIDAD_MAXIMA ? `No puede superar ${CANTIDAD_MAXIMA}` : errorDeCantidad(cantidad, unidad);
    if (problema) errores.push({ campo: 'cantidad', mensaje: problema });
  }

  let fechaIncorporacion: string | undefined;
  const fechaCruda = body.fechaIncorporacion;
  if (fechaCruda !== undefined && fechaCruda !== null && fechaCruda !== '') {
    if (typeof fechaCruda !== 'string') {
      errores.push({ campo: 'fechaIncorporacion', mensaje: 'Debe ser texto con formato AAAA-MM-DD' });
    } else {
      const problema = errorDeFecha(fechaCruda.trim(), hoy);
      if (problema) errores.push({ campo: 'fechaIncorporacion', mensaje: problema });
      else fechaIncorporacion = fechaCruda.trim();
    }
  }

  let favorito: boolean | undefined;
  if (body.favorito !== undefined && body.favorito !== null) {
    if (typeof body.favorito === 'boolean') favorito = body.favorito;
    else errores.push({ campo: 'favorito', mensaje: 'Debe ser verdadero o falso' });
  }

  if (errores.length > 0 || !categoria || !unidad || cantidad === undefined) {
    throw new ValidationError(errores);
  }

  const datos: DatosComponente = { nombre, categoria, descripcion, valor, cantidad, unidad, ubicacion, fabricante };
  if (fechaIncorporacion !== undefined) datos.fechaIncorporacion = fechaIncorporacion;
  if (favorito !== undefined) datos.favorito = favorito;
  return datos;
}

export function validarFavorito(body: unknown): boolean {
  if (!esObjeto(body) || typeof body.favorito !== 'boolean') {
    throw new ValidationError([{ campo: 'favorito', mensaje: 'Debe ser verdadero o falso' }]);
  }
  return body.favorito;
}

export type AjusteStock = { tipo: 'delta'; delta: number } | { tipo: 'cantidad'; cantidad: number };

/** Acepta `{ delta }` (ajuste relativo) o `{ cantidad }` (valor absoluto), nunca ambos. */
export function validarAjusteStock(body: unknown): AjusteStock {
  if (!esObjeto(body)) {
    throw new ValidationError([{ campo: 'body', mensaje: 'Se esperaba un objeto JSON' }]);
  }
  const tieneDelta = body.delta !== undefined;
  const tieneCantidad = body.cantidad !== undefined;
  if (tieneDelta === tieneCantidad) {
    throw new ValidationError([
      { campo: 'delta', mensaje: 'Enviá "delta" (ajuste relativo) o "cantidad" (valor final), uno solo' },
    ]);
  }
  const campo = tieneDelta ? 'delta' : 'cantidad';
  const valor = body[campo];
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new ValidationError([{ campo, mensaje: 'Debe ser un número' }]);
  }
  return tieneDelta ? { tipo: 'delta', delta: valor } : { tipo: 'cantidad', cantidad: valor };
}
