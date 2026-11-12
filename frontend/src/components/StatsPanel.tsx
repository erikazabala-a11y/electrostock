import type { Estadisticas, Vista } from "../types";
import { formatearCantidad } from "../utils/format";

interface Props {
  stats: Estadisticas | null;
  vista: Vista;
  categoria: string;
  onVista: (v: Vista) => void;
  onCategoria: (c: string) => void;
}

interface Ficha {
  clave: string;
  etiqueta: string;
  valor: number | undefined;
  detalle: string;
  tono: "verde" | "rosa" | "rosa-fuerte" | "neutro";
  vista: Vista;
}

export function StatsPanel({ stats, vista, categoria, onVista, onCategoria }: Props) {
  const fichas: Ficha[] = [
    {
      clave: "total",
      etiqueta: "Componentes",
      valor: stats?.totalComponentes,
      detalle: stats ? `${formatearCantidad(stats.disponibles)} disponibles · ${stats.ubicaciones} ubicaciones` : "",
      tono: "verde",
      vista: "todos",
    },
    {
      clave: "bajo",
      etiqueta: "Stock bajo",
      valor: stats?.stockBajo,
      detalle: stats ? `${stats.umbralStockBajo} o menos` : "",
      tono: "rosa",
      vista: "stockBajo",
    },
    {
      clave: "agotados",
      etiqueta: "Agotados",
      valor: stats?.agotados,
      detalle: "para reponer",
      tono: "rosa-fuerte",
      vista: "agotados",
    },
    {
      clave: "favoritos",
      etiqueta: "Favoritos",
      valor: stats?.favoritos,
      detalle: "los que más usás",
      tono: "neutro",
      vista: "favoritos",
    },
  ];

  const maximo = Math.max(1, ...(stats?.porCategoria.map((c) => c.componentes) ?? [1]));

  return (
    <section className="stats" aria-label="Estadísticas del inventario">
      <div className="fichas">
        {fichas.map((f) => (
          <button
            key={f.clave}
            type="button"
            className={`ficha ficha--${f.tono}${vista === f.vista && (f.vista !== "todos" || vista === "todos") ? " ficha--activa" : ""}`}
            aria-pressed={vista === f.vista}
            onClick={() => onVista(f.vista)}
          >
            <span className="ficha__etiqueta">{f.etiqueta}</span>
            {stats ? <span className="ficha__valor">{formatearCantidad(f.valor ?? 0)}</span> : <span className="ficha__valor esqueleto esqueleto--num" />}
            <span className="ficha__detalle">{f.detalle || " "}</span>
          </button>
        ))}
      </div>

      <div className="categorias panel">
        <h2 className="panel__titulo">Por categoría</h2>
        <ul className="categorias__lista">
          {(stats?.porCategoria ?? []).map((c) => (
            <li key={c.categoria}>
              <button
                type="button"
                className={`barra${categoria === c.categoria ? " barra--activa" : ""}`}
                aria-pressed={categoria === c.categoria}
                onClick={() => onCategoria(categoria === c.categoria ? "" : c.categoria)}
              >
                <span className="barra__nombre">{c.categoria}</span>
                <span className="barra__pista" aria-hidden="true">
                  <span className="barra__relleno" style={{ width: `${(c.componentes / maximo) * 100}%` }} />
                </span>
                <span className="barra__valor">{c.componentes}</span>
              </button>
            </li>
          ))}
          {!stats && <li className="esqueleto esqueleto--bloque" />}
        </ul>
      </div>
    </section>
  );
}
