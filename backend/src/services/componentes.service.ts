import { randomUUID } from 'node:crypto';
import {
  CATEGORIAS,
  UMBRAL_STOCK_BAJO,
  UNIDADES,
  aDTO,
  calcularEstado,
  claveUnica,
  errorDeCantidad,
  esStockBajo,
  hoyISO,
  normalizar,
  type Componente,
  type ComponenteDTO,
  type DatosComponente,
} from '../domain/componente.ts';
import { ConflictError, NotFoundError, ValidationError, type DetalleCampo } from '../errors.ts';
import type { ComponentesRepository } from '../repositories/componentes.repository.ts';
import { Mutex } from '../utils/mutex.ts';
import {
  esObjeto,
  validarAjusteStock,
  validarComponente,
  validarFavorito,
} from '../validators/componente.validator.ts';
import { validarFiltros, type FiltrosListado } from '../validators/filtros.validator.ts';

export interface OpcionesService {
  umbral?: number;
  hoy?: () => string;
  generarId?: () => string;
}

export interface ResultadoListado {
  data: ComponenteDTO[];
  meta: { total: number; pagina: number; limite: number; totalPaginas: number };
}

export interface Estadisticas {
  totalComponentes: number;
  disponibles: number;
  agotados: number;
  stockBajo: number;
  favoritos: number;
  ubicaciones: number;
  umbralStockBajo: number;
  porCategoria: { categoria: string; componentes: number }[];
}

export interface ResultadoImportacion {
  recibidos: number;
  importados: number;
  duplicados: { indice: number; nombre: string; idExistente: string | null }[];
  invalidos: { indice: number; detalles: DetalleCampo[] }[];
}

const MAX_IMPORTACION = 2000;
const comparadorTexto = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export class ComponentesService {
  private readonly umbral: number;
  private readonly hoy: () => string;
  private readonly generarId: () => string;
  /** Serializa las escrituras: evita que dos altas simultáneas se salten la regla de duplicados. */
  private readonly mutex = new Mutex();
  private readonly repo: ComponentesRepository;

  constructor(repo: ComponentesRepository, opciones: OpcionesService = {}) {
    this.repo = repo;
    this.umbral = opciones.umbral ?? UMBRAL_STOCK_BAJO;
    this.hoy = opciones.hoy ?? (() => hoyISO());
    this.generarId = opciones.generarId ?? randomUUID;
  }

  catalogos() {
    return { categorias: [...CATEGORIAS], unidades: [...UNIDADES], umbralStockBajo: this.umbral };
  }

  async crear(body: unknown): Promise<ComponenteDTO> {
    const datos = validarComponente(body, this.hoy());
    return this.mutex.ejecutar(async () => {
      await this.exigirSinDuplicado(datos);
      const componente: Componente = {
        id: this.generarId(),
        ...datos,
        fechaIncorporacion: datos.fechaIncorporacion ?? this.hoy(),
        favorito: datos.favorito ?? false,
      };
      await this.repo.guardar(componente);
      return aDTO(componente, this.umbral);
    });
  }

  async obtener(id: string): Promise<ComponenteDTO> {
    return aDTO(await this.existente(id), this.umbral);
  }

  async actualizar(id: string, body: unknown): Promise<ComponenteDTO> {
    const datos = validarComponente(body, this.hoy());
    return this.mutex.ejecutar(async () => {
      const actual = await this.existente(id);
      await this.exigirSinDuplicado(datos, id);
      const componente: Componente = {
        id,
        ...datos,
        fechaIncorporacion: datos.fechaIncorporacion ?? actual.fechaIncorporacion,
        favorito: datos.favorito ?? actual.favorito,
      };
      await this.repo.guardar(componente);
      return aDTO(componente, this.umbral);
    });
  }

  async eliminar(id: string): Promise<void> {
    await this.mutex.ejecutar(async () => {
      if (!(await this.repo.eliminar(id))) throw new NotFoundError('El componente no existe');
    });
  }

  async marcarFavorito(id: string, body: unknown): Promise<ComponenteDTO> {
    const favorito = validarFavorito(body);
    return this.mutex.ejecutar(async () => {
      const actualizado: Componente = { ...(await this.existente(id)), favorito };
      await this.repo.guardar(actualizado);
      return aDTO(actualizado, this.umbral);
    });
  }

  /** Ajuste relativo (`delta`) o absoluto (`cantidad`). Nunca deja el stock en negativo. */
  async ajustarStock(id: string, body: unknown): Promise<ComponenteDTO> {
    const ajuste = validarAjusteStock(body);
    return this.mutex.ejecutar(async () => {
      const actual = await this.existente(id);
      const campo = ajuste.tipo;
      const bruto = ajuste.tipo === 'delta' ? actual.cantidad + ajuste.delta : ajuste.cantidad;
      const cantidad = Math.round(bruto * 1e6) / 1e6; // evita 0.1 + 0.2 = 0.30000000000000004

      if (cantidad < 0) {
        throw new ValidationError([
          { campo, mensaje: `El stock no puede quedar en negativo (disponible: ${actual.cantidad})` },
        ]);
      }
      const problema = errorDeCantidad(cantidad, actual.unidad);
      if (problema) throw new ValidationError([{ campo, mensaje: problema }]);

      const actualizado: Componente = { ...actual, cantidad };
      await this.repo.guardar(actualizado);
      return aDTO(actualizado, this.umbral);
    });
  }

  async listar(query: URLSearchParams): Promise<ResultadoListado> {
    const filtros = validarFiltros(query);
    const todos = (await this.repo.listar()).map((c) => aDTO(c, this.umbral));
    const filtrados = this.filtrar(todos, filtros);
    this.ordenar(filtrados, filtros);

    const total = filtrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / filtros.limite));
    const desde = (filtros.pagina - 1) * filtros.limite;
    return {
      data: filtrados.slice(desde, desde + filtros.limite),
      meta: { total, pagina: filtros.pagina, limite: filtros.limite, totalPaginas },
    };
  }

  async estadisticas(): Promise<Estadisticas> {
    const todos = await this.repo.listar();
    const porCategoria = CATEGORIAS.map((categoria) => ({
      categoria: categoria as string,
      componentes: todos.filter((c) => c.categoria === categoria).length,
    }));
    return {
      totalComponentes: todos.length,
      disponibles: todos.filter((c) => calcularEstado(c.cantidad) === 'Disponible').length,
      agotados: todos.filter((c) => calcularEstado(c.cantidad) === 'Agotado').length,
      stockBajo: todos.filter((c) => esStockBajo(c.cantidad, this.umbral)).length,
      favoritos: todos.filter((c) => c.favorito).length,
      ubicaciones: new Set(todos.map((c) => normalizar(c.ubicacion))).size,
      umbralStockBajo: this.umbral,
      porCategoria,
    };
  }

  /** Migración por lote: importa lo válido y no repetido, e informa el resto. */
  async importar(body: unknown): Promise<ResultadoImportacion> {
    const lista = Array.isArray(body) ? body : esObjeto(body) ? body.componentes : undefined;
    if (!Array.isArray(lista)) {
      throw new ValidationError([{ campo: 'componentes', mensaje: 'Se esperaba una lista de componentes' }]);
    }
    if (lista.length > MAX_IMPORTACION) {
      throw new ValidationError([
        { campo: 'componentes', mensaje: `Se admiten hasta ${MAX_IMPORTACION} componentes por importación` },
      ]);
    }

    return this.mutex.ejecutar(async () => {
      const claves = new Map((await this.repo.listar()).map((c) => [claveUnica(c), c.id]));
      const resultado: ResultadoImportacion = { recibidos: lista.length, importados: 0, duplicados: [], invalidos: [] };
      const aGuardar: Componente[] = [];

      lista.forEach((item, indice) => {
        let datos: DatosComponente;
        try {
          datos = validarComponente(item, this.hoy());
        } catch (error) {
          if (error instanceof ValidationError) {
            resultado.invalidos.push({ indice, detalles: error.detalles as DetalleCampo[] });
            return;
          }
          throw error;
        }
        const clave = claveUnica(datos);
        if (claves.has(clave)) {
          resultado.duplicados.push({ indice, nombre: datos.nombre, idExistente: claves.get(clave) ?? null });
          return;
        }
        const id = this.generarId();
        claves.set(clave, id);
        aGuardar.push({
          id,
          ...datos,
          fechaIncorporacion: datos.fechaIncorporacion ?? this.hoy(),
          favorito: datos.favorito ?? false,
        });
      });

      if (aGuardar.length > 0) await this.repo.guardarVarios(aGuardar);
      resultado.importados = aGuardar.length;
      return resultado;
    });
  }

  private async existente(id: string): Promise<Componente> {
    const componente = await this.repo.buscarPorId(id);
    if (!componente) throw new NotFoundError('El componente no existe');
    return componente;
  }

  /** RN2. `ignorarId` permite que un componente se edite sin chocar consigo mismo. */
  private async exigirSinDuplicado(datos: DatosComponente, ignorarId?: string): Promise<void> {
    const clave = claveUnica(datos);
    const duplicado = (await this.repo.listar()).find((c) => c.id !== ignorarId && claveUnica(c) === clave);
    if (duplicado) {
      throw new ConflictError(
        `Ya existe "${duplicado.nombre}" con el mismo valor y fabricante. Actualizá su stock en lugar de crear otro registro.`,
        { idExistente: duplicado.id },
      );
    }
  }

  private filtrar(lista: ComponenteDTO[], f: FiltrosListado): ComponenteDTO[] {
    const busqueda = f.q ? normalizar(f.q) : undefined;
    return lista.filter(
      (c) =>
        (busqueda === undefined || normalizar(c.nombre).includes(busqueda)) &&
        (f.categoria === undefined || c.categoria === f.categoria) &&
        (f.favorito === undefined || c.favorito === f.favorito) &&
        (f.stockBajo === undefined || c.stockBajo === f.stockBajo) &&
        (f.estado === undefined || c.estado === f.estado),
    );
  }

  private ordenar(lista: ComponenteDTO[], { orden, dir }: FiltrosListado): void {
    const signo = dir === 'asc' ? 1 : -1;
    lista.sort((a, b) => {
      let cmp = 0;
      if (orden === 'cantidad') cmp = a.cantidad - b.cantidad;
      else if (orden === 'fecha') cmp = a.fechaIncorporacion.localeCompare(b.fechaIncorporacion);
      else cmp = comparadorTexto.compare(a.nombre, b.nombre);
      // Desempate estable por nombre para que la paginación sea predecible.
      return cmp * signo || comparadorTexto.compare(a.nombre, b.nombre) || a.id.localeCompare(b.id);
    });
  }
}
