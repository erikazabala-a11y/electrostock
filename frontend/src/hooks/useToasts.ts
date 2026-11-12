import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  tipo: "ok" | "error" | "info";
  texto: string;
}

let siguiente = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const cerrar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const avisar = useCallback(
    (tipo: Toast["tipo"], texto: string) => {
      const id = siguiente++;
      setToasts((t) => [...t.slice(-3), { id, tipo, texto }]);
      window.setTimeout(() => cerrar(id), tipo === "error" ? 6500 : 3500);
    },
    [cerrar],
  );

  return { toasts, avisar, cerrar };
}
