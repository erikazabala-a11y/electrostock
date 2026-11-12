export const CATEGORIAS = [
  'Resistencias',
  'Capacitores',
  'LEDs',
  'Transistores',
  'Microcontroladores',
  'Sensores',
  'Otros',
] as const;

export const UNIDADES = ['unidades', 'metros', 'rollos', 'paquetes'] as const;

export const UMBRAL_STOCK_BAJO = 5;

export type Categoria = (typeof CATEGORIAS)[number];
export type Unidad = (typeof UNIDADES)[number];
export type Estado = 'Disponible' | 'Agotado';

/** Lo que se guarda en disco. `estado` y `stockBajo` NO se persisten (se derivan). */
export interface Componente {
  id: string;
  nombre: string;
  categoria: Categoria;
  descripcion: string;
  valor: string;
  cantidad: number;
  unidad: Unidad;
  ubicacion: string;
  fabricante: string;
  fechaIncorporacion: string; // YYYY-MM-DD
  favorito: boolean;
}

/** Datos ya validados que vienen del cliente. Lo opcional lo completa el Service. */
export interface DatosComponente {
  nombre: string;
  categoria: Categoria;
  descripcion: string;
  valor: string;
  cantidad: number;
  unidad: Unidad;
  ubicacion: string;
  fabricante: string;
  fechaIncorporacion?: string;
  favorito?: boolean;
}

export interface ComponenteDTO extends Componente {
  estado: Estado;
  stockBajo: boolean;
}

/** Minúsculas, sin tildes y con espacios colapsados: base de búsqueda y duplicados. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** RN2: identidad de un componente = nombre + valor + fabricante normalizados. */
export function claveUnica(c: Pick<Componente, 'nombre' | 'valor' | 'fabricante'>): string {
  return [c.nombre, c.valor, c.fabricante].map(normalizar).join('|');
}

/** RN3 */
export function calcularEstado(cantidad: number): Estado {
  return cantidad > 0 ? 'Disponible' : 'Agotado';
}

/** RN4: un componente agotado no cuenta como stock bajo. */
export function esStockBajo(cantidad: number, umbral: number): boolean {
  return cantidad > 0 && cantidad <= umbral;
}

/** RN5: devuelve el mensaje de error o null si la cantidad es coherente con la unidad. */
export function errorDeCantidad(cantidad: number, unidad: Unidad | undefined): string | null {
  if (cantidad < 0) return 'No puede ser negativa';
  if (unidad === 'unidades' && !Number.isInteger(cantidad)) {
    return 'Debe ser un número entero cuando la unidad es "unidades"';
  }
  return null;
}

export function aDTO(c: Componente, umbral: number): ComponenteDTO {
  return { ...c, estado: calcularEstado(c.cantidad), stockBajo: esStockBajo(c.cantidad, umbral) };
}

/** Fecha local en formato YYYY-MM-DD. */
export function hoyISO(ahora: Date = new Date()): string {
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
