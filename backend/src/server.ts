import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ComponentesController } from './controllers/componentes.controller.ts';
import { crearApp } from './http/app.ts';
import { JsonFileComponentesRepository } from './repositories/json-file.componentes.repository.ts';
import { ComponentesService } from './services/componentes.service.ts';

const aqui = fileURLToPath(new URL('.', import.meta.url));

const puerto = Number(process.env.PORT ?? 3000);
const archivoDatos = resolve(process.env.DATA_FILE ?? resolve(aqui, '../data/componentes.json'));
const umbral = Number(process.env.STOCK_BAJO_UMBRAL ?? 5);
const dirFrontend = resolve(process.env.FRONTEND_DIST ?? resolve(aqui, '../../frontend/dist'));

// Composición: cada capa recibe a la siguiente por constructor.
const repo = new JsonFileComponentesRepository(archivoDatos);
const service = new ComponentesService(repo, { umbral });
const controller = new ComponentesController(service);
const app = crearApp(controller, {
  ...(existsSync(dirFrontend) ? { frontendDir: dirFrontend } : {}),
  ...(process.env.CORS_ORIGIN ? { corsOrigin: process.env.CORS_ORIGIN } : {}),
});

const servidor = createServer((req, res) => void app(req, res));
servidor.listen(puerto, () => {
  console.log(`⚡ Electrostock API en http://localhost:${puerto}/api`);
  console.log(`   Datos: ${archivoDatos}`);
  console.log(existsSync(dirFrontend) ? `   Interfaz: http://localhost:${puerto}` : '   (frontend sin compilar: usá npm run build)');
});

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => servidor.close(() => process.exit(0)));
}
