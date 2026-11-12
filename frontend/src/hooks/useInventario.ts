import { useCallback, useEffect, useState } from "react";
import { componentesApi } from "../api/componentesApi";
import type { Componente, Estadisticas, Filtros, Meta } from "../types";

type Estado =
  | { fase: "cargando"; items: Componente[]; meta: Meta | null }
  | { fase: "ok"; items: Componente[]; meta: Meta }
  | { fase: "error"; mensaje: string; items: Componente[]; meta: Meta | null };

/** Carga lista + estadísticas desde la API y se vuelve a cargar al cambiar filtros o llamar a `recargar`. */
export function useInventario(filtros: Filtros) {
  const [estado, setEstado] = useState<Estado>({ fase: "cargando", items: [], meta: null });
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  const { q, categoria, vista, orden, dir, pagina } = filtros;

  useEffect(() => {
    const ctl = new AbortController();
    setEstado((e) => ({ fase: "cargando", items: e.items, meta: e.meta }));
    componentesApi
      .listar({ q, categoria, vista, orden, dir, pagina }, ctl.signal)
      .then((r) => setEstado({ fase: "ok", items: r.data, meta: r.meta }))
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setEstado((prev) => ({ fase: "error", mensaje: e.message, items: prev.items, meta: prev.meta }));
      });
    return () => ctl.abort();
  }, [q, categoria, vista, orden, dir, pagina, version]);

  useEffect(() => {
    const ctl = new AbortController();
    componentesApi
      .estadisticas(ctl.signal)
      .then((r) => setStats(r.data))
      .catch(() => {}); // si falla, el error ya se informa desde la lista
    return () => ctl.abort();
  }, [version]);

  return { estado, stats, recargar };
}
