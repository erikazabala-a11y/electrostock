import type { Catalogos, Componente, DatosFormulario, Estadisticas, Filtros, Meta, ResultadoImportacion } from "../types";
import { pedir } from "./client";

function aQuery(f: Filtros): string {
  const p = new URLSearchParams({ orden: f.orden, dir: f.dir, pagina: String(f.pagina), limite: "12" });
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.vista === "favoritos") p.set("favorito", "true");
  if (f.vista === "stockBajo") p.set("stockBajo", "true");
  if (f.vista === "agotados") p.set("estado", "Agotado");
  return p.toString();
}

export const componentesApi = {
  listar: (f: Filtros, signal?: AbortSignal) => pedir<Componente[], Meta>(`/componentes?${aQuery(f)}`, { signal }),
  obtener: (id: string) => pedir<Componente>(`/componentes/${id}`),
  crear: (d: DatosFormulario) => pedir<Componente>("/componentes", { metodo: "POST", body: d }),
  actualizar: (id: string, d: DatosFormulario) => pedir<Componente>(`/componentes/${id}`, { metodo: "PUT", body: d }),
  eliminar: (id: string) => pedir<void>(`/componentes/${id}`, { metodo: "DELETE" }),
  favorito: (id: string, favorito: boolean) =>
    pedir<Componente>(`/componentes/${id}/favorito`, { metodo: "PATCH", body: { favorito } }),
  ajustarStock: (id: string, delta: number) =>
    pedir<Componente>(`/componentes/${id}/stock`, { metodo: "PATCH", body: { delta } }),
  estadisticas: (signal?: AbortSignal) => pedir<Estadisticas>("/estadisticas", { signal }),
  catalogos: () => pedir<Catalogos>("/catalogos"),
  importar: (lista: unknown) => pedir<ResultadoImportacion>("/componentes/importar", { metodo: "POST", body: lista }),
};
