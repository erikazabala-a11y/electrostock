import type { Meta } from "../types";

interface Props {
  meta: Meta;
  onPagina: (p: number) => void;
}

export function Pagination({ meta, onPagina }: Props) {
  if (meta.totalPaginas <= 1) return null;
  const desde = (meta.pagina - 1) * meta.limite + 1;
  const hasta = Math.min(meta.total, meta.pagina * meta.limite);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <button className="btn btn--suave btn--chico" disabled={meta.pagina <= 1} onClick={() => onPagina(meta.pagina - 1)}>
        ← Anterior
      </button>
      <span>
        {desde}–{hasta} de {meta.total} · Página {meta.pagina}/{meta.totalPaginas}
      </span>
      <button
        className="btn btn--suave btn--chico"
        disabled={meta.pagina >= meta.totalPaginas}
        onClick={() => onPagina(meta.pagina + 1)}
      >
        Siguiente →
      </button>
    </nav>
  );
}
