import type { Componente } from '../domain/componente.ts';

/** Contrato de persistencia. El Service no sabe si detrás hay un archivo, memoria o una base de datos. */
export interface ComponentesRepository {
  listar(): Promise<Componente[]>;
  buscarPorId(id: string): Promise<Componente | undefined>;
  /** Inserta o reemplaza (según el id). */
  guardar(componente: Componente): Promise<void>;
  /** Inserta o reemplaza varios en una sola escritura. */
  guardarVarios(componentes: Componente[]): Promise<void>;
  /** Devuelve false si no existía. */
  eliminar(id: string): Promise<boolean>;
}

/** Aplica inserciones/reemplazos sobre una lista sin mutarla. */
export function upsert(actuales: Componente[], nuevos: Componente[]): Componente[] {
  const resultado = [...actuales];
  for (const nuevo of nuevos) {
    const i = resultado.findIndex((c) => c.id === nuevo.id);
    if (i >= 0) resultado[i] = nuevo;
    else resultado.push(nuevo);
  }
  return resultado;
}
