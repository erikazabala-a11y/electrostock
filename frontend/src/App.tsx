import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "./api/client";
import { componentesApi } from "./api/componentesApi";
import { ComponenteCard } from "./components/ComponenteCard";
import { ComponenteForm } from "./components/ComponenteForm";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Header } from "./components/Header";
import { IconoAlerta, IconoCaja } from "./components/Icons";
import { ImportBanner } from "./components/ImportBanner";
import { Pagination } from "./components/Pagination";
import { StatsPanel } from "./components/StatsPanel";
import { Toasts } from "./components/Toasts";
import { Toolbar } from "./components/Toolbar";
import { useCatalogos } from "./hooks/useCatalogos";
import { useDebounce } from "./hooks/useDebounce";
import { useInventario } from "./hooks/useInventario";
import { useToasts } from "./hooks/useToasts";
import type { Componente, Filtros } from "./types";

const FILTROS_INICIALES: Filtros = { q: "", categoria: "", vista: "todos", orden: "nombre", dir: "asc", pagina: 1 };

type Formulario = { abierto: false } | { abierto: true; componente: Componente | null };

export default function App() {
  const catalogos = useCatalogos();
  const { toasts, avisar, cerrar } = useToasts();

  const [busqueda, setBusqueda] = useState("");
  const q = useDebounce(busqueda, 250);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const filtrosEfectivos = useMemo(() => ({ ...filtros, q }), [filtros, q]);

  const { estado, stats, recargar } = useInventario(filtrosEfectivos);

  const [formulario, setFormulario] = useState<Formulario>({ abierto: false });
  const [aEliminar, setAEliminar] = useState<Componente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set());

  // Al buscar, la primera página es la que interesa.
  useEffect(() => {
    setFiltros((f) => (f.pagina === 1 ? f : { ...f, pagina: 1 }));
  }, [q]);

  // Si borrás el último ítem de una página, volvé a la anterior.
  useEffect(() => {
    if (estado.fase === "ok" && estado.items.length === 0 && filtros.pagina > 1) {
      setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }));
    }
  }, [estado, filtros.pagina]);

  const cambiarFiltros = useCallback((cambio: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, pagina: 1, ...cambio }));
  }, []);

  const conOcupado = useCallback(async (id: string, tarea: () => Promise<void>) => {
    setOcupados((s) => new Set(s).add(id));
    try {
      await tarea();
    } finally {
      setOcupados((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, []);

  const mensajeDe = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Ocurrió un error inesperado");

  const alternarFavorito = (c: Componente) =>
    conOcupado(c.id, async () => {
      try {
        await componentesApi.favorito(c.id, !c.favorito);
        recargar();
      } catch (e) {
        avisar("error", mensajeDe(e));
      }
    });

  const ajustarStock = (c: Componente, delta: number) =>
    conOcupado(c.id, async () => {
      try {
        const r = await componentesApi.ajustarStock(c.id, delta);
        if (r.data.estado === "Agotado") avisar("info", `“${c.nombre}” quedó agotado`);
        recargar();
      } catch (e) {
        avisar("error", mensajeDe(e));
      }
    });

  async function confirmarEliminar() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await componentesApi.eliminar(aEliminar.id);
      avisar("ok", `“${aEliminar.nombre}” eliminado`);
      setAEliminar(null);
      recargar();
    } catch (e) {
      avisar("error", mensajeDe(e));
    } finally {
      setEliminando(false);
    }
  }

  async function abrirExistente(id: string) {
    try {
      const r = await componentesApi.obtener(id);
      setFormulario({ abierto: true, componente: r.data });
    } catch (e) {
      avisar("error", mensajeDe(e));
    }
  }

  const hayFiltros = busqueda !== "" || filtros.categoria !== "" || filtros.vista !== "todos";
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltros(FILTROS_INICIALES);
  };

  const cargandoLista = estado.fase === "cargando";

  return (
    <>
      <Header onNuevo={() => setFormulario({ abierto: true, componente: null })} />

      <main className="contenedor principal">
        <ImportBanner onResultado={avisar} onImportado={recargar} />

        <StatsPanel
          stats={stats}
          vista={filtros.vista}
          categoria={filtros.categoria}
          onVista={(vista) => cambiarFiltros({ vista })}
          onCategoria={(categoria) => cambiarFiltros({ categoria })}
        />

        <Toolbar
          busqueda={busqueda}
          filtros={filtros}
          categorias={catalogos.categorias}
          onBusqueda={setBusqueda}
          onCambio={cambiarFiltros}
        />

        <p className="resultado" aria-live="polite">
          {estado.meta ? (
            <>
              <strong>{estado.meta.total}</strong> {estado.meta.total === 1 ? "componente" : "componentes"}
              {hayFiltros && (
                <>
                  {" · "}
                  <button type="button" className="enlace" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </button>
                </>
              )}
            </>
          ) : (
            " "
          )}
        </p>

        {estado.fase === "error" && (
          <div className="aviso aviso--error" role="alert">
            <IconoAlerta />
            <div>
              <p>{estado.mensaje}</p>
              <button type="button" className="btn btn--suave btn--chico" onClick={recargar}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {estado.fase === "cargando" && estado.items.length === 0 && (
          <div className="grilla" aria-busy="true" aria-label="Cargando inventario">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="tarjeta esqueleto esqueleto--tarjeta" />
            ))}
          </div>
        )}

        {estado.items.length > 0 && (
          <div className={`grilla${cargandoLista ? " grilla--cargando" : ""}`}>
            {estado.items.map((c) => (
              <ComponenteCard
                key={c.id}
                c={c}
                ocupado={ocupados.has(c.id)}
                onFavorito={alternarFavorito}
                onStock={ajustarStock}
                onEditar={(x) => setFormulario({ abierto: true, componente: x })}
                onEliminar={setAEliminar}
              />
            ))}
          </div>
        )}

        {estado.fase === "ok" && estado.items.length === 0 && (
          <div className="vacio">
            <IconoCaja size={44} />
            {hayFiltros ? (
              <>
                <h2>No encontramos componentes</h2>
                <p>Probá con otra búsqueda o quitá algún filtro.</p>
                <button type="button" className="btn btn--suave" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <h2>Tu inventario está vacío</h2>
                <p>Agregá tu primer componente para empezar a organizar el taller.</p>
                <button type="button" className="btn btn--rosa" onClick={() => setFormulario({ abierto: true, componente: null })}>
                  Agregar componente
                </button>
              </>
            )}
          </div>
        )}

        {estado.meta && <Pagination meta={estado.meta} onPagina={(pagina) => setFiltros((f) => ({ ...f, pagina }))} />}
      </main>

      <footer className="pie">Electrostock · inventario de componentes electrónicos</footer>

      {formulario.abierto && (
        <ComponenteForm
          key={formulario.componente?.id ?? "nuevo"}
          inicial={formulario.componente}
          catalogos={catalogos}
          onCerrar={() => setFormulario({ abierto: false })}
          onVerExistente={abrirExistente}
          onGuardado={(c, esNuevo) => {
            setFormulario({ abierto: false });
            avisar("ok", esNuevo ? `“${c.nombre}” agregado al inventario` : `“${c.nombre}” actualizado`);
            recargar();
          }}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar componente?"
          mensaje={`Vas a eliminar “${aEliminar.nombre}” (${aEliminar.cantidad} ${aEliminar.unidad}). Esta acción no se puede deshacer.`}
          confirmar="Sí, eliminar"
          cargando={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}

      <Toasts toasts={toasts} onCerrar={cerrar} />
    </>
  );
}
