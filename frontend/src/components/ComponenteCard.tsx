import type { Componente } from "../types";
import { formatearCantidad, formatearFecha, unidadVisible } from "../utils/format";
import { IconoBasura, IconoEditar, IconoEstrella, IconoMas, IconoMenos, IconoUbicacion } from "./Icons";

interface Props {
  c: Componente;
  ocupado: boolean;
  onFavorito: (c: Componente) => void;
  onStock: (c: Componente, delta: number) => void;
  onEditar: (c: Componente) => void;
  onEliminar: (c: Componente) => void;
}

export function ComponenteCard({ c, ocupado, onFavorito, onStock, onEditar, onEliminar }: Props) {
  const agotado = c.estado === "Agotado";
  const paso = 1;

  return (
    <article className={`tarjeta${agotado ? " tarjeta--agotado" : c.stockBajo ? " tarjeta--bajo" : ""}`} aria-busy={ocupado}>
      <header className="tarjeta__cabeza">
        <div className="tarjeta__titulo">
          <span className="chip">{c.categoria}</span>
          <h3>{c.nombre}</h3>
        </div>
        <button
          type="button"
          className={`icono-btn estrella${c.favorito ? " estrella--on" : ""}`}
          aria-pressed={c.favorito}
          aria-label={c.favorito ? `Quitar ${c.nombre} de favoritos` : `Marcar ${c.nombre} como favorito`}
          onClick={() => onFavorito(c)}
          disabled={ocupado}
        >
          <IconoEstrella filled={c.favorito} />
        </button>
      </header>

      {(c.valor || c.descripcion) && (
        <p className="tarjeta__detalle">
          {c.valor && <span className="valor">{c.valor}</span>}
          {c.descripcion && <span>{c.descripcion}</span>}
        </p>
      )}

      <div className="stock">
        <button
          type="button"
          className="icono-btn icono-btn--contorno"
          aria-label={`Restar ${paso} a ${c.nombre}`}
          onClick={() => onStock(c, -paso)}
          disabled={ocupado || c.cantidad < paso}
        >
          <IconoMenos />
        </button>
        <div className="stock__cantidad" aria-live="polite">
          <strong>{formatearCantidad(c.cantidad)}</strong>
          <span>{unidadVisible(c.unidad, c.cantidad)}</span>
        </div>
        <button
          type="button"
          className="icono-btn icono-btn--contorno"
          aria-label={`Sumar ${paso} a ${c.nombre}`}
          onClick={() => onStock(c, paso)}
          disabled={ocupado}
        >
          <IconoMas />
        </button>
        <span className={`insignia ${agotado ? "insignia--agotado" : c.stockBajo ? "insignia--bajo" : "insignia--ok"}`}>
          {agotado ? "Agotado" : c.stockBajo ? "Stock bajo" : "Disponible"}
        </span>
      </div>

      <dl className="tarjeta__datos">
        <div>
          <dt>
            <IconoUbicacion size={15} />
            <span className="sr-only">Ubicación</span>
          </dt>
          <dd>{c.ubicacion}</dd>
        </div>
        {c.fabricante && (
          <div>
            <dt>Fabricante</dt>
            <dd>{c.fabricante}</dd>
          </div>
        )}
        <div>
          <dt>Incorporado</dt>
          <dd>{formatearFecha(c.fechaIncorporacion)}</dd>
        </div>
      </dl>

      <footer className="tarjeta__acciones">
        <button type="button" className="btn btn--suave btn--chico" onClick={() => onEditar(c)} disabled={ocupado}>
          <IconoEditar size={16} /> Editar
        </button>
        <button type="button" className="btn btn--peligro btn--chico" onClick={() => onEliminar(c)} disabled={ocupado}>
          <IconoBasura size={16} /> Eliminar
        </button>
      </footer>
    </article>
  );
}
