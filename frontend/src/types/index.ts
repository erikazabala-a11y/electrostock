export type Estado = "Disponible" | "Agotado";

export interface Componente {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  valor: string;
  cantidad: number;
  unidad: string;
  ubicacion: string;
  fabricante: string;
  fechaIncorporacion: string;
  favorito: boolean;
  estado: Estado;
  stockBajo: boolean;
}

/** Lo que el formulario envía (estado y stockBajo los calcula el backend). */
export interface DatosFormulario {
  nombre: string;
  categoria: string;
  descripcion: string;
  valor: string;
  cantidad: number;
  unidad: string;
  ubicacion: string;
  fabricante: string;
  fechaIncorporacion: string;
  favorito: boolean;
}

export interface Catalogos {
  categorias: string[];
  unidades: string[];
  umbralStockBajo: number;
}

export interface Estadisticas {
  totalComponentes: number;
  disponibles: number;
  agotados: number;
  stockBajo: number;
  favoritos: number;
  ubicaciones: number;
  umbralStockBajo: number;
  porCategoria: { categoria: string; componentes: number }[];
}

export interface Meta {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ResultadoImportacion {
  importados: number;
  duplicados: { indice: number; nombre: string; idExistente: string | null }[];
  invalidos: { indice: number; detalles: { campo: string; mensaje: string }[] }[];
}

export type Vista = "todos" | "favoritos" | "stockBajo" | "agotados";
export type Orden = "nombre" | "cantidad" | "fecha";

export interface Filtros {
  q: string;
  categoria: string;
  vista: Vista;
  orden: Orden;
  dir: "asc" | "desc";
  pagina: number;
}
