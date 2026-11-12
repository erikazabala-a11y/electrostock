import { Dialogo } from "./Dialogo";

interface Props {
  titulo: string;
  mensaje: string;
  confirmar: string;
  cargando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({ titulo, mensaje, confirmar, cargando, onConfirmar, onCancelar }: Props) {
  return (
    <Dialogo titulo={titulo} onCerrar={onCancelar} ancho="chico">
      <p className="dialogo__texto">{mensaje}</p>
      <div className="dialogo__acciones">
        <button type="button" className="btn btn--suave" onClick={onCancelar} disabled={cargando} autoFocus>
          Cancelar
        </button>
        <button type="button" className="btn btn--rosa" onClick={onConfirmar} disabled={cargando}>
          {cargando ? "Eliminando…" : confirmar}
        </button>
      </div>
    </Dialogo>
  );
}
