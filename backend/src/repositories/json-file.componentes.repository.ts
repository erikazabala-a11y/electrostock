import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Componente } from '../domain/componente.ts';
import { StorageError } from '../errors.ts';
import { Mutex } from '../utils/mutex.ts';
import { upsert, type ComponentesRepository } from './componentes.repository.ts';

/**
 * Persiste en un archivo JSON (el equivalente servidor del localStorage).
 * - Lee una vez y mantiene una copia en memoria.
 * - Escribe de forma atómica: archivo temporal + rename.
 * - La copia en memoria solo cambia si el disco se escribió bien.
 * - Si el archivo está dañado, falla con un error claro: nunca lo pisa en silencio.
 */
export class JsonFileComponentesRepository implements ComponentesRepository {
  private datos: Componente[] | null = null;
  private readonly mutex = new Mutex();
  private readonly ruta: string;

  constructor(ruta: string) {
    this.ruta = ruta;
  }

  async listar(): Promise<Componente[]> {
    return [...(await this.cargar())];
  }

  async buscarPorId(id: string): Promise<Componente | undefined> {
    return (await this.cargar()).find((c) => c.id === id);
  }

  guardar(componente: Componente): Promise<void> {
    return this.guardarVarios([componente]);
  }

  guardarVarios(componentes: Componente[]): Promise<void> {
    return this.mutex.ejecutar(async () => {
      const actuales = await this.cargar();
      await this.persistir(upsert(actuales, componentes));
    });
  }

  eliminar(id: string): Promise<boolean> {
    return this.mutex.ejecutar(async () => {
      const actuales = await this.cargar();
      const restantes = actuales.filter((c) => c.id !== id);
      if (restantes.length === actuales.length) return false;
      await this.persistir(restantes);
      return true;
    });
  }

  private async cargar(): Promise<Componente[]> {
    if (this.datos) return this.datos;
    let texto: string;
    try {
      texto = await readFile(this.ruta, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.datos = [];
        return this.datos;
      }
      throw new StorageError(`No se pudo leer el archivo de datos (${this.ruta}).`);
    }
    try {
      const parseado: unknown = texto.trim() === '' ? [] : JSON.parse(texto);
      if (!Array.isArray(parseado)) throw new Error('no es una lista');
      this.datos = parseado as Componente[];
      return this.datos;
    } catch {
      throw new StorageError(
        `El archivo de datos está dañado (${this.ruta}). No se modificó: revisalo o restauralo desde un respaldo.`,
      );
    }
  }

  private async persistir(nuevos: Componente[]): Promise<void> {
    const temporal = `${this.ruta}.tmp`;
    try {
      await mkdir(dirname(this.ruta), { recursive: true });
      await writeFile(temporal, JSON.stringify(nuevos, null, 2), 'utf8');
      await rename(temporal, this.ruta);
    } catch {
      throw new StorageError('No se pudo guardar en el disco. Los datos anteriores se conservan.');
    }
    this.datos = nuevos;
  }
}
