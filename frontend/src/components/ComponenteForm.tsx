import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { componentesApi } from "../api/componentesApi";
import type { Catalogos, Componente } from "../types";
import { hoyISO } from "../utils/format";
import { aDatos, camposDe, camposVacios, validar, type Campos, type Errores } from "../utils/validar";
import { Dialogo } from "./Dialogo";
import { IconoAlerta } from "./Icons";

interface Props {
  inicial: Componente | null;
  catalogos: Catalogos;
  onCerrar: () => void;
  onGuardado: (c: Componente, esNuevo: boolean) => void;
  onVerExistente: (id: string) => void;
}

function Campo({ etiqueta, error, ayuda, children, obligatorio }: {
  etiqueta: string;
  error?: string | undefined;
  ayuda?: string;
  obligatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`campo${error ? " campo--error" : ""}`}>
      <span className="campo__etiqueta">
        {etiqueta}
        {obligatorio && <abbr title="obligatorio"> *</abbr>}
      </span>
      {children}
      {error ? (
        <span className="campo__error" role="alert">
          {error}
        </span>
      ) : (
        ayuda && <span className="campo__ayuda">{ayuda}</span>
      )}
    </label>
  );
}

export function ComponenteForm({ inicial, catalogos, onCerrar, onGuardado, onVerExistente }: Props) {
  const esNuevo = inicial === null;
  const [campos, setCampos] = useState<Campos>(inicial ? camposDe(inicial) : camposVacios());
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [duplicadoId, setDuplicadoId] = useState<string | null>(null);

  function cambiar<K extends keyof Campos>(clave: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [clave]: valor }));
    if (errores[clave]) setErrores((e) => ({ ...e, [clave]: undefined }));
    setErrorGeneral(null);
    setDuplicadoId(null);
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const encontrados = validar(campos, catalogos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      const primero = Object.keys(encontrados)[0];
      document.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setEnviando(true);
    setErrorGeneral(null);
    setDuplicadoId(null);
    try {
      const datos = aDatos(campos);
      const r = inicial ? await componentesApi.actualizar(inicial.id, datos) : await componentesApi.crear(datos);
      onGuardado(r.data, esNuevo);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.idExistente) setDuplicadoId(e.idExistente);
        const porCampo = e.porCampo;
        if (Object.keys(porCampo).length > 0) setErrores(porCampo as Errores);
        setErrorGeneral(e.message);
      } else {
        setErrorGeneral("Ocurrió un error inesperado. Probá de nuevo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const decimales = campos.unidad !== "unidades";

  return (
    <Dialogo titulo={esNuevo ? "Nuevo componente" : "Editar componente"} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar} noValidate>
        {errorGeneral && (
          <div className="aviso aviso--error" role="alert">
            <IconoAlerta />
            <div>
              <p>{errorGeneral}</p>
              {duplicadoId && (
                <button type="button" className="btn btn--suave btn--chico" onClick={() => onVerExistente(duplicadoId)}>
                  Abrir el existente para ajustar su stock
                </button>
              )}
            </div>
          </div>
        )}

        <div className="formulario__grilla">
          <div className="formulario__ancho">
            <Campo etiqueta="Nombre" obligatorio error={errores.nombre}>
              <input
                name="nombre"
                value={campos.nombre}
                maxLength={80}
                placeholder="Ej: Resistencia 220 Ω"
                autoFocus
                onChange={(e) => cambiar("nombre", e.target.value)}
              />
            </Campo>
          </div>

          <Campo etiqueta="Categoría" obligatorio error={errores.categoria}>
            <select name="categoria" value={campos.categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
              <option value="">Elegí una categoría…</option>
              {catalogos.categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Valor" error={errores.valor} ayuda="Ej: 220 Ω, 100 μF">
            <input name="valor" value={campos.valor} maxLength={40} onChange={(e) => cambiar("valor", e.target.value)} />
          </Campo>

          <Campo etiqueta="Cantidad" obligatorio error={errores.cantidad}>
            <input
              name="cantidad"
              inputMode={decimales ? "decimal" : "numeric"}
              value={campos.cantidad}
              placeholder="0"
              onChange={(e) => cambiar("cantidad", e.target.value)}
            />
          </Campo>

          <Campo etiqueta="Unidad" obligatorio error={errores.unidad}>
            <select name="unidad" value={campos.unidad} onChange={(e) => cambiar("unidad", e.target.value)}>
              {catalogos.unidades.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Ubicación" obligatorio error={errores.ubicacion} ayuda="Cajón, caja o estante">
            <input
              name="ubicacion"
              value={campos.ubicacion}
              maxLength={80}
              placeholder="Ej: Cajón 2"
              onChange={(e) => cambiar("ubicacion", e.target.value)}
            />
          </Campo>

          <Campo etiqueta="Fabricante" error={errores.fabricante}>
            <input name="fabricante" value={campos.fabricante} maxLength={80} onChange={(e) => cambiar("fabricante", e.target.value)} />
          </Campo>

          <Campo etiqueta="Fecha de incorporación" error={errores.fechaIncorporacion}>
            <input
              name="fechaIncorporacion"
              type="date"
              max={hoyISO()}
              value={campos.fechaIncorporacion}
              onChange={(e) => cambiar("fechaIncorporacion", e.target.value)}
            />
          </Campo>

          <div className="formulario__ancho">
            <Campo etiqueta="Descripción" error={errores.descripcion}>
              <textarea
                name="descripcion"
                rows={2}
                maxLength={300}
                value={campos.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
              />
            </Campo>
          </div>

          <label className="check formulario__ancho">
            <input type="checkbox" checked={campos.favorito} onChange={(e) => cambiar("favorito", e.target.checked)} />
            <span>Marcar como favorito</span>
          </label>
        </div>

        <div className="dialogo__acciones">
          <button type="button" className="btn btn--suave" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--verde" disabled={enviando}>
            {enviando ? "Guardando…" : esNuevo ? "Agregar al inventario" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
