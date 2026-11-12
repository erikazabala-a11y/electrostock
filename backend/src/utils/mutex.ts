/** Ejecuta las tareas de a una, en orden de llegada. */
export class Mutex {
  private cola: Promise<unknown> = Promise.resolve();

  ejecutar<T>(tarea: () => Promise<T>): Promise<T> {
    const resultado = this.cola.then(tarea);
    this.cola = resultado.catch(() => undefined);
    return resultado;
  }
}
