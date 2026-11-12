import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: "normal" | "chico";
}

/** Modal accesible basado en <dialog>: foco atrapado, Esc para cerrar y clic afuera. */
export function Dialogo({ titulo, onCerrar, children, ancho = "normal" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (dlg && !dlg.open) dlg.showModal();
    document.body.classList.add("sin-scroll");
    return () => document.body.classList.remove("sin-scroll");
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialogo dialogo--${ancho}`}
      aria-labelledby="dialogo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      <h2 id="dialogo-titulo" className="dialogo__titulo">
        {titulo}
      </h2>
      {children}
    </dialog>
  );
}
