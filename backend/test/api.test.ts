import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { levantarApi, valido } from './helpers.ts';

describe('API HTTP /api', () => {
  let api: Awaited<ReturnType<typeof levantarApi>>;
  before(async () => { api = await levantarApi(); });
  after(async () => { await api.cerrar(); });

  it('GET /salud y /catalogos', async () => {
    assert.equal((await api.pedir('GET', '/api/salud')).json.data.estado, 'ok');
    const cat = (await api.pedir('GET', '/api/catalogos')).json.data;
    assert.ok(cat.categorias.includes('LEDs') && cat.unidades.includes('metros'));
    assert.equal(cat.umbralStockBajo, 5);
  });

  it('flujo completo: POST 201 + Location → GET → PUT → PATCH → DELETE 204', async () => {
    const creado = await api.pedir('POST', '/api/componentes', valido({ nombre: 'Flujo', estado: 'Disponible', cantidad: 0 }));
    assert.equal(creado.status, 201);
    const { id, estado } = creado.json.data;
    assert.equal(creado.headers.get('location'), `/api/componentes/${id}`);
    assert.equal(estado, 'Agotado');

    assert.equal((await api.pedir('GET', `/api/componentes/${id}`)).json.data.nombre, 'Flujo');

    const editado = await api.pedir('PUT', `/api/componentes/${id}`, valido({ nombre: 'Flujo 2', cantidad: 4 }));
    assert.equal(editado.status, 200);
    assert.equal(editado.json.data.stockBajo, true);

    const fav = await api.pedir('PATCH', `/api/componentes/${id}/favorito`, { favorito: true });
    assert.equal(fav.json.data.favorito, true);

    const stock = await api.pedir('PATCH', `/api/componentes/${id}/stock`, { delta: -1 });
    assert.equal(stock.json.data.cantidad, 3);
    const negativo = await api.pedir('PATCH', `/api/componentes/${id}/stock`, { delta: -50 });
    assert.equal(negativo.status, 400);

    assert.equal((await api.pedir('DELETE', `/api/componentes/${id}`)).status, 204);
    assert.equal((await api.pedir('GET', `/api/componentes/${id}`)).status, 404);
    assert.equal((await api.pedir('DELETE', `/api/componentes/${id}`)).status, 404);
  });

  it('POST duplicado → 409 con el id existente', async () => {
    const a = await api.pedir('POST', '/api/componentes', valido({ nombre: 'Dup' }));
    const b = await api.pedir('POST', '/api/componentes', valido({ nombre: 'dup' }));
    assert.equal(b.status, 409);
    assert.equal(b.json.error.codigo, 'DUPLICADO');
    assert.equal(b.json.error.detalles.idExistente, a.json.data.id);
  });

  it('POST inválido → 400 con detalle por campo', async () => {
    const r = await api.pedir('POST', '/api/componentes', { cantidad: -1 });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.codigo, 'VALIDACION');
    assert.ok(r.json.error.detalles.some((d: { campo: string }) => d.campo === 'nombre'));
  });

  it('JSON roto → 400 JSON_INVALIDO', async () => {
    const r = await api.pedir('POST', '/api/componentes', undefined, '{roto');
    assert.equal(r.status, 400);
    assert.equal(r.json.error.codigo, 'JSON_INVALIDO');
  });

  it('listado con filtros, estadísticas e importación', async () => {
    await api.pedir('POST', '/api/componentes', valido({ nombre: 'Lista A', valor: 'a', cantidad: 2 }));
    const lista = await api.pedir('GET', '/api/componentes?q=lista&stockBajo=true&orden=cantidad&limite=10');
    assert.equal(lista.status, 200);
    assert.equal(lista.json.meta.total, 1);

    const imp = await api.pedir('POST', '/api/componentes/importar', [valido({ nombre: 'Importado', valor: 'i' }), valido({ nombre: 'Importado', valor: 'i' })]);
    assert.equal(imp.status, 200);
    assert.equal(imp.json.data.importados, 1);
    assert.equal(imp.json.data.duplicados.length, 1);
    assert.equal((await api.pedir('POST', '/api/componentes/importar', { x: 1 })).status, 400);

    const est = (await api.pedir('GET', '/api/estadisticas')).json.data;
    assert.ok(est.totalComponentes >= 3 && Array.isArray(est.porCategoria));
  });

  it('filtro inválido → 400; ruta desconocida → 404; método no permitido → 405', async () => {
    assert.equal((await api.pedir('GET', '/api/componentes?orden=color')).status, 400);
    assert.equal((await api.pedir('GET', '/api/nada')).status, 404);
    assert.equal((await api.pedir('GET', '/otra-cosa')).status, 404);
    const r = await api.pedir('DELETE', '/api/componentes');
    assert.equal(r.status, 405);
    assert.match(r.headers.get('allow') ?? '', /GET/);
  });
});
