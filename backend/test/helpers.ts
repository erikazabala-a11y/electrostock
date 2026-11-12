import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ComponentesController } from '../src/controllers/componentes.controller.ts';
import { crearApp } from '../src/http/app.ts';
import { MemoryComponentesRepository } from '../src/repositories/memory.componentes.repository.ts';
import { ComponentesService } from '../src/services/componentes.service.ts';

export const HOY = '2026-10-15';

export const valido = (extra: Record<string, unknown> = {}) => ({
  nombre: 'Resistencia 220 Ω',
  categoria: 'Resistencias',
  descripcion: '1/4 W, 5%',
  valor: '220 Ω',
  cantidad: 100,
  unidad: 'unidades',
  ubicacion: 'Cajón 2',
  fabricante: 'Yageo',
  ...extra,
});

export function crearServicio(repo = new MemoryComponentesRepository()) {
  let n = 0;
  const service = new ComponentesService(repo, { hoy: () => HOY, generarId: () => `id-${++n}`, umbral: 5 });
  return { service, repo };
}

export async function levantarApi() {
  const { service, repo } = crearServicio();
  const app = crearApp(new ComponentesController(service));
  const servidor: Server = createServer((req, res) => void app(req, res));
  await new Promise<void>((ok) => servidor.listen(0, ok));
  const base = `http://localhost:${(servidor.address() as AddressInfo).port}`;

  async function pedir(metodo: string, ruta: string, body?: unknown, crudo?: string) {
    const res = await fetch(base + ruta, {
      method: metodo,
      ...(body !== undefined || crudo !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: crudo ?? JSON.stringify(body) }
        : {}),
    });
    const texto = await res.text();
    return { status: res.status, headers: res.headers, json: texto ? JSON.parse(texto) : undefined };
  }
  return { pedir, repo, cerrar: () => new Promise<void>((ok) => servidor.close(() => ok())) };
}
