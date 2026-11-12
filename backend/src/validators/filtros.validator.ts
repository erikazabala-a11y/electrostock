import { CATEGORIAS, type Categoria, type Estado } from '../domain/componente.ts';
import { ValidationError, type DetalleCampo } from '../errors.ts';

export const CRITERIOS_ORDEN = ['nombre', 'cantidad', 'fecha'] as const;
export type CriterioOrden = (typeof CRITERIOS_ORDEN)[number];

export const LIMITE_MAXIMO = 200;
export const LIMITE_POR_DEFECTO = 50;

export interface FiltrosListado {
  q?: string;
  categoria?: Categoria;
  favorito?: boolean;
  stockBajo?: boolean;
  estado?: Estado;
  orden: CriterioOrden;
  dir: 'asc' | 'desc';
  pagina: number;
  limite: number;
}

function leerBooleano(valor: string | null, campo: string, errores: DetalleCampo[]): boolean | undefined {
  if (valor === null || valor === '') return undefined;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  errores.push({ campo, mensaje: 'Debe ser "true" o "false"' });
  return undefined;
}

function leerEntero(valor: string | null, campo: string, errores: DetalleCampo[], min: number, max: number, defecto: number): number {
  if (valor === null || valor === '') return defecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    errores.push({ campo, mensaje: `Debe ser un entero entre ${min} y ${max}` });
    return defecto;
  }
  return n;
}

export function validarFiltros(query: URLSearchParams): FiltrosListado {
  const errores: DetalleCampo[] = [];
  const filtros: FiltrosListado = { orden: 'nombre', dir: 'asc', pagina: 1, limite: LIMITE_POR_DEFECTO };

  const q = query.get('q')?.trim();
  if (q) {
    if (q.length > 100) errores.push({ campo: 'q', mensaje: 'Debe tener como máximo 100 caracteres' });
    else filtros.q = q;
  }

  const categoria = query.get('categoria');
  if (categoria) {
    const encontrada = CATEGORIAS.find((c) => c === categoria);
    if (encontrada) filtros.categoria = encontrada;
    else errores.push({ campo: 'categoria', mensaje: `Debe ser una de: ${CATEGORIAS.join(', ')}` });
  }

  const favorito = leerBooleano(query.get('favorito'), 'favorito', errores);
  if (favorito !== undefined) filtros.favorito = favorito;
  const stockBajo = leerBooleano(query.get('stockBajo'), 'stockBajo', errores);
  if (stockBajo !== undefined) filtros.stockBajo = stockBajo;

  const estado = query.get('estado');
  if (estado) {
    if (estado === 'Disponible' || estado === 'Agotado') filtros.estado = estado;
    else errores.push({ campo: 'estado', mensaje: 'Debe ser Disponible o Agotado' });
  }

  const orden = query.get('orden');
  if (orden) {
    const encontrado = CRITERIOS_ORDEN.find((o) => o === orden);
    if (encontrado) filtros.orden = encontrado;
    else errores.push({ campo: 'orden', mensaje: `Debe ser uno de: ${CRITERIOS_ORDEN.join(', ')}` });
  }

  const dir = query.get('dir');
  if (dir) {
    if (dir === 'asc' || dir === 'desc') filtros.dir = dir;
    else errores.push({ campo: 'dir', mensaje: 'Debe ser asc o desc' });
  }

  filtros.pagina = leerEntero(query.get('pagina'), 'pagina', errores, 1, 1_000_000, 1);
  filtros.limite = leerEntero(query.get('limite'), 'limite', errores, 1, LIMITE_MAXIMO, LIMITE_POR_DEFECTO);

  if (errores.length > 0) throw new ValidationError(errores, 'Los parámetros de consulta no son válidos');
  return filtros;
}
