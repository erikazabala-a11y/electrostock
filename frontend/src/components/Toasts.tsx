import type { Toast } from "../hooks/useToasts";
import { IconoAlerta, IconoCerrar, IconoCheck } from "./Icons";

interface Props {
  toasts: Toast[];
  onCerrar: (id: number) => void;
}

export function Toasts({ toasts, onCerrar }: Props) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tipo}`}>
          {t.tipo === "error" ? <IconoAlerta /> : <IconoCheck />}
          <span>{t.texto}</span>
          <button type="button" className="icono-btn" aria-label="Cerrar aviso" onClick={() => onCerrar(t.id)}>
            <IconoCerrar size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
