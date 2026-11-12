import { IconoMas, Logo } from "./Icons";

interface Props {
  onNuevo: () => void;
}

export function Header({ onNuevo }: Props) {
  return (
    <header className="header">
      <div className="header__trazas" aria-hidden="true" />
      <div className="contenedor header__fila">
        <div className="marca">
          <Logo size={44} />
          <div>
            <h1 className="marca__nombre">Electrostock</h1>
            <p className="marca__lema">Tu taller, siempre en orden</p>
          </div>
        </div>
        <button className="btn btn--rosa" onClick={onNuevo}>
          <IconoMas /> <span>Nuevo componente</span>
        </button>
      </div>
    </header>
  );
}
