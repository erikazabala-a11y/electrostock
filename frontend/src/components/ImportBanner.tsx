import { useState } from "react";
import { componentesApi } from "../api/componentesApi";
import { IconoDescarga } from "./Icons";

/** Claves donde la versión anterior (solo frontend) pudo haber guardado el inventario. */
const CLAVES = ["electrostock:componentes", "electrostock-componentes", "electrostock_componentes", "electrostock", "componentes"];
const MARCA = "electrostock:migrado";

function leerLocal(): { clave: string; lista: unknown[] } | null {
  try {
    if (localStorage.getItem(MARCA)) return null;
    for (const clave of CLAVES) {
      const crudo = localStorage.getItem(clave);
      if (!crudo) continue;
      const lista: unknown = JSON.parse(crudo);
      if (Array.isArray(lista) && lista.length > 0) return { clave, lista };
    }
  } catch {
    /* localStorage bloqueado o JSON dañado: simplemente no se ofrece importar */
  }
  return null;
}

/** Prepara cada ítem viejo: el backend recalcula estado e id, y valida el resto. */
function prepararItem(x: unknown): unknown {
  if (typeof x !== "object" || x === null) return x;
  const { id: _id, estado: _estado, stockBajo: _sb, ...resto } = x as Record<string, unknown>;
  const cantidad = typeof resto.cantidad === "string" ? Number(resto.cantidad.replace(",", ".")) : resto.cantidad;
  return { ...resto, cantidad };
}

interface Props {
  onResultado: (tipo: "ok" | "error" | "info", texto: string) => void;
  onImportado: () => void;
}

export function ImportBanner({ onResultado, onImportado }: Props) {
  const [hallado, setHallado] = useState(leerLocal);
  const [cargando, setCargando] = useState(false);

  if (!hallado) return null;

  async function importar() {
    if (!hallado) return;
    setCargando(true);
    try {
      const r = await componentesApi.importar(hallado.lista.map(prepararItem));
      const { importados, duplicados, invalidos } = r.data;
      onResultado(
        importados > 0 ? "ok" : "info",
        `Importados ${importados} · repetidos ${duplicados.length} · con errores ${invalidos.length}`,
      );
      try {
        localStorage.setItem(MARCA, "1"); // los datos originales NO se borran
      } catch {
        /* sin permiso para guardar la marca: el aviso volverá a aparecer, no es grave */
      }
      setHallado(null);
      onImportado();
    } catch (e) {
      onResultado("error", e instanceof Error ? e.message : "No se pudo importar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="aviso aviso--info" role="region" aria-label="Importar datos anteriores">
      <IconoDescarga />
      <div>
        <p>
          Encontramos <strong>{hallado.lista.length}</strong> componentes guardados en este navegador (versión anterior de
          Electrostock). ¿Querés pasarlos al servidor?
        </p>
        <p className="aviso__chico">Tus datos originales no se borran.</p>
        <div className="aviso__acciones">
          <button type="button" className="btn btn--verde btn--chico" onClick={importar} disabled={cargando}>
            {cargando ? "Importando…" : "Importar ahora"}
          </button>
          <button
            type="button"
            className="btn btn--suave btn--chico"
            onClick={() => {
              try {
                localStorage.setItem(MARCA, "1");
              } catch {
                /* ver arriba */
              }
              setHallado(null);
            }}
          >
            No, gracias
          </button>
        </div>
      </div>
    </div>
  );
}
