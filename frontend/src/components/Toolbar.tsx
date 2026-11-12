import type { Filtros, Vista } from "../types";
import { IconoBuscar, IconoCerrar } from "./Icons";

export const ORDENES = [
  { valor: "nombre:asc", etiqueta: "Nombre (A → Z)" },
  { valor: "nombre:desc", etiqueta: "Nombre (Z → A)" },
  { valor: "cantidad:desc", etiqueta: "Mayor cantidad" },
  { valor: "cantidad:asc", etiqueta: "Menor cantidad" },
  { valor: "fecha:desc", etiqueta: "Más recientes" },
  { valor: "fecha:asc", etiqueta: "Más antiguos" },
] as const;

const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "favoritos", etiqueta: "Favoritos" },
  { valor: "stockBajo", etiqueta: "Stock bajo" },
  { valor: "agotados", etiqueta: "Agotados" },
];

interface Props {
  busqueda: string;
  filtros: Filtros;
  categorias: string[];
  onBusqueda: (q: string) => void;
  onCambio: (cambio: Partial<Filtros>) => void;
}

export function Toolbar({ busqueda, filtros, categorias, onBusqueda, onCambio }: Props) {
  return (
    <section className="toolbar" aria-label="Buscar y filtrar">
      <div className="toolbar__fila">
        <label className="buscador">
          <span className="sr-only">Buscar por nombre</span>
          <IconoBuscar />
          <input
            type="search"
            placeholder="Buscar por nombre… (ej: capacitor)"
            value={busqueda}
            maxLength={100}
            onChange={(e) => onBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" className="buscador__borrar" aria-label="Borrar búsqueda" onClick={() => onBusqueda("")}>
              <IconoCerrar size={16} />
            </button>
          )}
        </label>

        <label className="selector">
          <span className="sr-only">Categoría</span>
          <select value={filtros.categoria} onChange={(e) => onCambio({ categoria: e.target.value })}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="selector">
          <span className="sr-only">Ordenar por</span>
          <select
            value={`${filtros.orden}:${filtros.dir}`}
            onChange={(e) => {
              const [orden, dir] = e.target.value.split(":") as [Filtros["orden"], Filtros["dir"]];
              onCambio({ orden, dir });
            }}
          >
            {ORDENES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="segmentos" role="group" aria-label="Mostrar">
        {VISTAS.map((v) => (
          <button
            key={v.valor}
            type="button"
            className={`segmento${filtros.vista === v.valor ? " segmento--activo" : ""}`}
            aria-pressed={filtros.vista === v.valor}
            onClick={() => onCambio({ vista: v.valor })}
          >
            {v.etiqueta}
          </button>
        ))}
      </div>
    </section>
  );
}
