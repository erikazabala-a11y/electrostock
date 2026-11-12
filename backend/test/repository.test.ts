import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { Componente } from '../src/domain/componente.ts';
import { StorageError } from '../src/errors.ts';
import { JsonFileComponentesRepository } from '../src/repositories/json-file.componentes.repository.ts';

const base: Componente = {
  id: 'a', nombre: 'LED', categoria: 'LEDs', descripcion: '', valor: '', cantidad: 1,
  unidad: 'unidades', ubicacion: 'Caja', fabricante: '', fechaIncorporacion: '2026-10-01', favorito: false,
};

describe('JsonFileComponentesRepository', () => {
  it('conserva los datos tras "reiniciar" (nueva instancia, mismo archivo)', async () => {
    const ruta = join(await mkdtemp(join(tmpdir(), 'es-')), 'data', 'c.json');
    await new JsonFileComponentesRepository(ruta).guardar(base);
    const otra = new JsonFileComponentesRepository(ruta);
    assert.deepEqual(await otra.listar(), [base]);
    assert.deepEqual(await otra.buscarPorId('a'), base);
  });
  it('reemplaza por id, elimina y no deja archivos temporales', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'es-'));
    const repo = new JsonFileComponentesRepository(join(dir, 'c.json'));
    await repo.guardarVarios([base, { ...base, id: 'b' }]);
    await repo.guardar({ ...base, cantidad: 9 });
    assert.equal((await repo.buscarPorId('a'))?.cantidad, 9);
    assert.equal(await repo.eliminar('b'), true);
    assert.equal(await repo.eliminar('b'), false);
    assert.deepEqual(await readdir(dir), ['c.json']);
  });
  it('escrituras concurrentes no se pisan', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'es-'));
    const repo = new JsonFileComponentesRepository(join(dir, 'c.json'));
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.guardar({ ...base, id: `id${i}` })));
    assert.equal((await repo.listar()).length, 25);
    const enDisco = JSON.parse(await readFile(join(dir, 'c.json'), 'utf8')) as unknown[];
    assert.equal(enDisco.length, 25);
  });
  it('si el archivo está dañado falla con StorageError y NO lo pisa', async () => {
    const ruta = join(await mkdtemp(join(tmpdir(), 'es-')), 'c.json');
    await writeFile(ruta, '{esto no es json');
    const repo = new JsonFileComponentesRepository(ruta);
    await assert.rejects(() => repo.listar(), StorageError);
    await assert.rejects(() => repo.guardar(base), StorageError);
    assert.equal(await readFile(ruta, 'utf8'), '{esto no es json');
  });
  it('si no se puede escribir informa y la memoria queda intacta', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'es-'));
    const repo = new JsonFileComponentesRepository(join(dir, 'c.json'));
    await repo.guardar(base);
    await chmod(dir, 0o500);
    t.after(() => chmod(dir, 0o700));
    if (process.getuid?.() === 0) return t.skip('root ignora permisos de carpeta');
    await assert.rejects(() => repo.guardar({ ...base, id: 'b' }), StorageError);
    assert.equal((await repo.listar()).length, 1);
  });
});
