import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import type { ComponentesController, Peticion, Respuesta } from '../controllers/componentes.controller.ts';
import { AppError } from '../errors.ts';

export interface OpcionesApp {
  /** Carpeta con el frontend compilado. Si existe, se sirve junto con la API. */
  frontendDir?: string;
  /** Origen permitido por CORS (solo hace falta si el frontend corre en otro puerto). */
  corsOrigin?: string;
  maxBodyBytes?: number;
}

type Manejador = (req: Peticion) => Promise<Respuesta>;
interface Ruta {
  metodo: string;
  patron: RegExp;
  manejador: Manejador;
}

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

class CuerpoInvalido extends AppError {}

export function crearApp(c: ComponentesController, opciones: OpcionesApp = {}) {
  const rutas: Ruta[] = [
    { metodo: 'GET', patron: /^\/api\/salud$/, manejador: c.salud },
    { metodo: 'GET', patron: /^\/api\/catalogos$/, manejador: c.catalogos },
    { metodo: 'GET', patron: /^\/api\/estadisticas$/, manejador: c.estadisticas },
    { metodo: 'POST', patron: /^\/api\/componentes\/importar$/, manejador: c.importar },
    { metodo: 'GET', patron: /^\/api\/componentes$/, manejador: c.listar },
    { metodo: 'POST', patron: /^\/api\/componentes$/, manejador: c.crear },
    { metodo: 'GET', patron: /^\/api\/componentes\/(?<id>[^/]+)$/, manejador: c.obtener },
    { metodo: 'PUT', patron: /^\/api\/componentes\/(?<id>[^/]+)$/, manejador: c.actualizar },
    { metodo: 'DELETE', patron: /^\/api\/componentes\/(?<id>[^/]+)$/, manejador: c.eliminar },
    { metodo: 'PATCH', patron: /^\/api\/componentes\/(?<id>[^/]+)\/favorito$/, manejador: c.favorito },
    { metodo: 'PATCH', patron: /^\/api\/componentes\/(?<id>[^/]+)\/stock$/, manejador: c.stock },
  ];

  const maxBytes = opciones.maxBodyBytes ?? 5 * 1024 * 1024;

  function enviarJson(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
    const base: Record<string, string> = { 'X-Content-Type-Options': 'nosniff', ...headers };
    if (opciones.corsOrigin) {
      base['Access-Control-Allow-Origin'] = opciones.corsOrigin;
      base['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
      base['Access-Control-Allow-Headers'] = 'Content-Type';
    }
    if (body === undefined) {
      res.writeHead(status, base).end();
      return;
    }
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...base }).end(JSON.stringify(body));
  }

  function enviarError(res: ServerResponse, status: number, codigo: string, mensaje: string, detalles?: unknown) {
    enviarJson(res, status, { error: { codigo, mensaje, ...(detalles !== undefined ? { detalles } : {}) } });
  }

  async function leerCuerpo(req: IncomingMessage): Promise<unknown> {
    const trozos: Buffer[] = [];
    let total = 0;
    for await (const trozo of req) {
      total += (trozo as Buffer).length;
      if (total > maxBytes) throw new AppError(413, 'CUERPO_GRANDE', 'El cuerpo de la petición es demasiado grande');
      trozos.push(trozo as Buffer);
    }
    const texto = Buffer.concat(trozos).toString('utf8');
    if (texto.trim() === '') return undefined;
    try {
      return JSON.parse(texto);
    } catch {
      throw new CuerpoInvalido(400, 'JSON_INVALIDO', 'El cuerpo no es un JSON válido');
    }
  }

  async function servirFrontend(url: URL, res: ServerResponse): Promise<boolean> {
    const raiz = opciones.frontendDir;
    if (!raiz) return false;
    let relativa: string;
    try {
      relativa = normalize(decodeURIComponent(url.pathname));
    } catch {
      return false;
    }
    let archivo = join(raiz, relativa);
    if (archivo !== raiz && !archivo.startsWith(raiz + sep)) return false; // path traversal

    let info = await stat(archivo).catch(() => null);
    if (info?.isDirectory()) {
      archivo = join(archivo, 'index.html');
      info = await stat(archivo).catch(() => null);
    }
    // Rutas del SPA (sin extensión) vuelven al index; un asset inexistente da 404.
    if (!info?.isFile()) {
      if (extname(relativa) !== '') return false;
      archivo = join(raiz, 'index.html');
    }
    try {
      const contenido = await readFile(archivo);
      const cache = archivo.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
      res
        .writeHead(200, {
          'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
          'Cache-Control': cache,
          'X-Content-Type-Options': 'nosniff',
        })
        .end(contenido);
      return true;
    } catch {
      return false;
    }
  }

  return async function manejar(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const metodo = req.method ?? 'GET';

      if (metodo === 'OPTIONS' && opciones.corsOrigin) return enviarJson(res, 204);

      if (!url.pathname.startsWith('/api/')) {
        if (metodo === 'GET' || metodo === 'HEAD') {
          if (await servirFrontend(url, res)) return;
        }
        return enviarError(res, 404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${url.pathname}`);
      }

      const coincidentes = rutas.filter((r) => r.patron.test(url.pathname));
      if (coincidentes.length === 0) {
        return enviarError(res, 404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${url.pathname}`);
      }
      const ruta = coincidentes.find((r) => r.metodo === metodo);
      if (!ruta) {
        const permitidos = coincidentes.map((r) => r.metodo).join(', ');
        res.setHeader('Allow', permitidos);
        return enviarError(res, 405, 'METODO_NO_PERMITIDO', `Método ${metodo} no permitido. Usá: ${permitidos}`);
      }

      const params: Record<string, string> = {};
      for (const [clave, valor] of Object.entries(ruta.patron.exec(url.pathname)?.groups ?? {})) {
        params[clave] = decodeURIComponent(valor);
      }
      const body = metodo === 'POST' || metodo === 'PUT' || metodo === 'PATCH' ? await leerCuerpo(req) : undefined;

      const respuesta = await ruta.manejador({ params, query: url.searchParams, body });
      enviarJson(res, respuesta.status, respuesta.body, respuesta.headers);
    } catch (error) {
      if (error instanceof AppError) {
        return enviarError(res, error.status, error.codigo, error.message, error.detalles);
      }
      console.error('Error inesperado:', error);
      enviarError(res, 500, 'ERROR_INTERNO', 'Ocurrió un error inesperado en el servidor');
    }
  };
}
