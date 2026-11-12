import type { ComponentesService } from '../services/componentes.service.ts';

export interface Peticion {
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

export interface Respuesta {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Traduce HTTP ⇄ Service. No contiene reglas de negocio ni toca datos. */
export class ComponentesController {
  private readonly service: ComponentesService;

  constructor(service: ComponentesService) {
    this.service = service;
  }

  salud = async (): Promise<Respuesta> => ({ status: 200, body: { data: { estado: 'ok' } } });

  catalogos = async (): Promise<Respuesta> => ({ status: 200, body: { data: this.service.catalogos() } });

  crear = async (req: Peticion): Promise<Respuesta> => {
    const creado = await this.service.crear(req.body);
    return { status: 201, headers: { Location: `/api/componentes/${creado.id}` }, body: { data: creado } };
  };

  listar = async (req: Peticion): Promise<Respuesta> => {
    const { data, meta } = await this.service.listar(req.query);
    return { status: 200, body: { data, meta } };
  };

  obtener = async (req: Peticion): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.obtener(req.params.id ?? '') },
  });

  actualizar = async (req: Peticion): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.actualizar(req.params.id ?? '', req.body) },
  });

  eliminar = async (req: Peticion): Promise<Respuesta> => {
    await this.service.eliminar(req.params.id ?? '');
    return { status: 204 };
  };

  favorito = async (req: Peticion): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.marcarFavorito(req.params.id ?? '', req.body) },
  });

  stock = async (req: Peticion): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.ajustarStock(req.params.id ?? '', req.body) },
  });

  estadisticas = async (): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.estadisticas() },
  });

  importar = async (req: Peticion): Promise<Respuesta> => ({
    status: 200,
    body: { data: await this.service.importar(req.body) },
  });
}
