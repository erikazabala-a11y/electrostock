import { useEffect, useState } from "react";
import { componentesApi } from "../api/componentesApi";
import type { Catalogos } from "../types";

/** Respaldo para que el formulario funcione aunque el catálogo tarde en llegar. */
const RESPALDO: Catalogos = {
  categorias: ["Resistencias", "Capacitores", "LEDs", "Transistores", "Microcontroladores", "Sensores", "Otros"],
  unidades: ["unidades", "metros", "rollos", "paquetes"],
  umbralStockBajo: 5,
};

export function useCatalogos(): Catalogos {
  const [catalogos, setCatalogos] = useState<Catalogos>(RESPALDO);
  useEffect(() => {
    componentesApi
      .catalogos()
      .then((r) => setCatalogos(r.data))
      .catch(() => {});
  }, []);
  return catalogos;
}
