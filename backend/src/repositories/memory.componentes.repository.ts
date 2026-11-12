import type { Componente } from '../domain/componente.ts';
import { upsert, type ComponentesRepository } from './componentes.repository.ts';

/** Implementación en memoria: rápida y sin disco, pensada para tests. */
export class MemoryComponentesRepository implements ComponentesRepository {
  private datos: Componente[];

  constructor(iniciales: Componente[] = []) {
    this.datos = [...iniciales];
  }

  async listar(): Promise<Componente[]> {
    return [...this.datos];
  }

  async buscarPorId(id: string): Promise<Componente | undefined> {
    return this.datos.find((c) => c.id === id);
  }

  async guardar(componente: Componente): Promise<void> {
    this.datos = upsert(this.datos, [componente]);
  }

  async guardarVarios(componentes: Componente[]): Promise<void> {
    this.datos = upsert(this.datos, componentes);
  }

  async eliminar(id: string): Promise<boolean> {
    const antes = this.datos.length;
    this.datos = this.datos.filter((c) => c.id !== id);
    return this.datos.length < antes;
  }
}
