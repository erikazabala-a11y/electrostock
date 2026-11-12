import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictError, NotFoundError, ValidationError } from '../src/errors.ts';
import { HOY, crearServicio, valido } from './helpers.ts';

const q = (s: string) => new URLSearchParams(s);
const camposInvalidos = (e: unknown) => ((e as ValidationError).detalles as { campo: string }[]).map((d) => d.campo);

describe('ComponentesService.crear', () => {
  it('crea con id, fecha por defecto, estado derivado y favorito=false', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido());
    assert.equal(c.id, 'id-1');
    assert.equal(c.fechaIncorporacion, HOY);
    assert.equal(c.favorito, false);
    assert.equal(c.estado, 'Disponible');
    assert.equal(c.stockBajo, false);
  });
  it('ignora el estado que manda el cliente: con cantidad 0 es Agotado', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ cantidad: 0, estado: 'Disponible' }));
    assert.equal(c.estado, 'Agotado');
    assert.equal(c.stockBajo, false);
  });
  it('marca stock bajo cuando 0 < cantidad <= umbral', async () => {
    const { service } = crearServicio();
    assert.equal((await service.crear(valido({ cantidad: 5 }))).stockBajo, true);
  });
  it('recorta y colapsa espacios', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ nombre: '  LED    rojo  ', ubicacion: ' Caja   1 ' }));
    assert.equal(c.nombre, 'LED rojo');
    assert.equal(c.ubicacion, 'Caja 1');
  });
  it('reporta TODOS los campos inválidos juntos', async () => {
    const { service } = crearServicio();
    await assert.rejects(
      () => service.crear({ nombre: '', categoria: 'X', unidad: 'kg', cantidad: -1 }),
      (e) => {
        assert.ok(e instanceof ValidationError);
        assert.deepEqual(camposInvalidos(e).sort(), ['cantidad', 'categoria', 'nombre', 'ubicacion', 'unidad']);
        return true;
      },
    );
  });
  it('decimal solo si la unidad lo permite (RN5)', async () => {
    const { service } = crearServicio();
    await assert.rejects(() => service.crear(valido({ cantidad: 2.5 })), ValidationError);
    const c = await service.crear(valido({ cantidad: 2.5, unidad: 'metros' }));
    assert.equal(c.cantidad, 2.5);
  });
  it('rechaza fechas futuras, inexistentes o con mal formato (RN6)', async () => {
    const { service } = crearServicio();
    for (const f of ['2026-10-16', '2026-02-30', '15/10/2026', 'ayer']) {
      await assert.rejects(() => service.crear(valido({ fechaIncorporacion: f })), ValidationError, f);
    }
    assert.equal((await service.crear(valido({ fechaIncorporacion: HOY }))).fechaIncorporacion, HOY);
  });
  it('rechaza cantidades que no son números y textos demasiado largos', async () => {
    const { service } = crearServicio();
    await assert.rejects(() => service.crear(valido({ cantidad: '10' })), ValidationError);
    await assert.rejects(() => service.crear(valido({ nombre: 'x'.repeat(81) })), ValidationError);
    await assert.rejects(() => service.crear(valido({ nombre: 'A' })), ValidationError);
  });
  it('rechaza un body que no es un objeto', async () => {
    const { service } = crearServicio();
    for (const b of [null, [], 'hola', 7]) await assert.rejects(() => service.crear(b), ValidationError);
  });
  it('evita duplicados ignorando mayúsculas/tildes/espacios e informa el id (RN2)', async () => {
    const { service } = crearServicio();
    const original = await service.crear(valido());
    await assert.rejects(
      () => service.crear(valido({ nombre: ' resistencia  220 ω ', fabricante: 'YAGEO' })),
      (e) => {
        assert.ok(e instanceof ConflictError);
        assert.deepEqual(e.detalles, { idExistente: original.id });
        return true;
      },
    );
  });
  it('permite el mismo nombre si cambia valor o fabricante', async () => {
    const { service } = crearServicio();
    await service.crear(valido());
    await service.crear(valido({ valor: '330 Ω' }));
    await service.crear(valido({ fabricante: 'Vishay' }));
    assert.equal((await service.listar(q(''))).meta.total, 3);
  });
  it('altas simultáneas idénticas: solo una se crea', async () => {
    const { service } = crearServicio();
    const r = await Promise.allSettled([service.crear(valido()), service.crear(valido()), service.crear(valido())]);
    assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1);
    assert.equal((await service.listar(q(''))).meta.total, 1);
  });
});

describe('ComponentesService.actualizar / eliminar / favorito', () => {
  it('actualiza conservando id, fecha y favorito si no se envían', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ fechaIncorporacion: '2026-01-01', favorito: true }));
    const e = await service.actualizar(c.id, valido({ cantidad: 0, ubicacion: 'Estante 9' }));
    assert.equal(e.id, c.id);
    assert.equal(e.fechaIncorporacion, '2026-01-01');
    assert.equal(e.favorito, true);
    assert.equal(e.estado, 'Agotado');
    assert.equal(e.ubicacion, 'Estante 9');
  });
  it('un componente puede guardarse a sí mismo sin chocar con su propia clave', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido());
    await service.actualizar(c.id, valido({ cantidad: 7 }));
  });
  it('editar hacia la clave de OTRO componente da 409', async () => {
    const { service } = crearServicio();
    await service.crear(valido());
    const otro = await service.crear(valido({ valor: '330 Ω' }));
    await assert.rejects(() => service.actualizar(otro.id, valido()), ConflictError);
  });
  it('actualizar/eliminar/favorito/stock de un id inexistente dan 404', async () => {
    const { service } = crearServicio();
    await assert.rejects(() => service.actualizar('nada', valido()), NotFoundError);
    await assert.rejects(() => service.eliminar('nada'), NotFoundError);
    await assert.rejects(() => service.marcarFavorito('nada', { favorito: true }), NotFoundError);
    await assert.rejects(() => service.ajustarStock('nada', { delta: 1 }), NotFoundError);
  });
  it('elimina y libera la clave para volver a crearlo', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido());
    await service.eliminar(c.id);
    await assert.rejects(() => service.obtener(c.id), NotFoundError);
    await service.crear(valido());
  });
  it('marca y desmarca favorito (RN8) y valida el booleano', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido());
    assert.equal((await service.marcarFavorito(c.id, { favorito: true })).favorito, true);
    assert.equal((await service.marcarFavorito(c.id, { favorito: false })).favorito, false);
    await assert.rejects(() => service.marcarFavorito(c.id, { favorito: 'si' }), ValidationError);
    await assert.rejects(() => service.marcarFavorito(c.id, {}), ValidationError);
  });
});

describe('ComponentesService.ajustarStock', () => {
  it('ajuste relativo y absoluto', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ cantidad: 10 }));
    assert.equal((await service.ajustarStock(c.id, { delta: -3 })).cantidad, 7);
    assert.equal((await service.ajustarStock(c.id, { delta: 5 })).cantidad, 12);
    assert.equal((await service.ajustarStock(c.id, { cantidad: 40 })).cantidad, 40);
  });
  it('no permite quedar en negativo y no modifica el dato', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ cantidad: 2 }));
    await assert.rejects(() => service.ajustarStock(c.id, { delta: -3 }), ValidationError);
    assert.equal((await service.obtener(c.id)).cantidad, 2);
  });
  it('llegar a 0 deja el componente Agotado', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido({ cantidad: 2 }));
    const r = await service.ajustarStock(c.id, { delta: -2 });
    assert.equal(r.estado, 'Agotado');
    assert.equal(r.stockBajo, false);
  });
  it('respeta enteros en "unidades" y decimales en "metros" sin errores de redondeo', async () => {
    const { service } = crearServicio();
    const u = await service.crear(valido({ cantidad: 10 }));
    await assert.rejects(() => service.ajustarStock(u.id, { delta: 0.5 }), ValidationError);
    const m = await service.crear(valido({ valor: '1 m', unidad: 'metros', cantidad: 0.1 }));
    assert.equal((await service.ajustarStock(m.id, { delta: 0.2 })).cantidad, 0.3);
  });
  it('exige delta o cantidad, uno solo y numérico', async () => {
    const { service } = crearServicio();
    const c = await service.crear(valido());
    for (const b of [{}, { delta: 1, cantidad: 1 }, { delta: '1' }, null]) {
      await assert.rejects(() => service.ajustarStock(c.id, b), ValidationError);
    }
  });
});

describe('ComponentesService.listar', () => {
  async function cargar() {
    const t = crearServicio();
    await t.service.crear(valido({ nombre: 'Capacitor electrolítico', categoria: 'Capacitores', valor: '100 μF', cantidad: 30, fechaIncorporacion: '2026-09-01' }));
    await t.service.crear(valido({ nombre: 'LED rojo', categoria: 'LEDs', valor: 'Rojo', cantidad: 3, fechaIncorporacion: '2026-10-01', favorito: true }));
    await t.service.crear(valido({ nombre: 'Arduino Uno', categoria: 'Microcontroladores', valor: 'R3', cantidad: 0, fechaIncorporacion: '2026-08-01' }));
    return t.service;
  }
  const nombres = (r: { data: { nombre: string }[] }) => r.data.map((c) => c.nombre);

  it('busca por nombre sin importar tildes ni mayúsculas (RN7)', async () => {
    const s = await cargar();
    assert.deepEqual(nombres(await s.listar(q('q=ELECTROLITICO'))), ['Capacitor electrolítico']);
    assert.deepEqual(nombres(await s.listar(q('q=ard'))), ['Arduino Uno']);
    assert.equal((await s.listar(q('q=zzz'))).meta.total, 0);
  });
  it('filtra por categoría, favorito, stock bajo y estado', async () => {
    const s = await cargar();
    assert.deepEqual(nombres(await s.listar(q('categoria=LEDs'))), ['LED rojo']);
    assert.deepEqual(nombres(await s.listar(q('favorito=true'))), ['LED rojo']);
    assert.deepEqual(nombres(await s.listar(q('stockBajo=true'))), ['LED rojo']); // Arduino (0) no cuenta
    assert.deepEqual(nombres(await s.listar(q('estado=Agotado'))), ['Arduino Uno']);
  });
  it('ordena por nombre (por defecto), cantidad y fecha', async () => {
    const s = await cargar();
    assert.deepEqual(nombres(await s.listar(q(''))), ['Arduino Uno', 'Capacitor electrolítico', 'LED rojo']);
    assert.deepEqual(nombres(await s.listar(q('orden=cantidad&dir=desc'))), ['Capacitor electrolítico', 'LED rojo', 'Arduino Uno']);
    assert.deepEqual(nombres(await s.listar(q('orden=fecha&dir=asc'))), ['Arduino Uno', 'Capacitor electrolítico', 'LED rojo']);
  });
  it('pagina los resultados', async () => {
    const s = await cargar();
    const r = await s.listar(q('limite=2&pagina=2'));
    assert.deepEqual(nombres(r), ['LED rojo']);
    assert.deepEqual(r.meta, { total: 3, pagina: 2, limite: 2, totalPaginas: 2 });
  });
  it('rechaza parámetros inválidos', async () => {
    const s = await cargar();
    for (const p of ['categoria=Zapatos', 'orden=color', 'dir=arriba', 'limite=500', 'pagina=0', 'favorito=quizas', 'estado=Roto']) {
      await assert.rejects(() => s.listar(q(p)), ValidationError, p);
    }
  });
  it('rinde con muchos componentes (3000 en < 1 s)', async () => {
    const t = crearServicio();
    const lote = Array.from({ length: 2000 }, (_, i) => valido({ nombre: `Pieza ${i}`, valor: `${i}` }));
    await t.service.importar(lote);
    for (let i = 2000; i < 3000; i++) await t.repo.guardar({ ...(await t.repo.listar())[0]!, id: `x${i}`, nombre: `Otra ${i}` });
    const inicio = performance.now();
    const r = await t.service.listar(q('q=pieza 19&orden=cantidad&dir=desc'));
    assert.ok(r.meta.total > 0);
    assert.ok(performance.now() - inicio < 1000);
  });
});

describe('ComponentesService.estadisticas e importar', () => {
  it('calcula totales y por categoría', async () => {
    const { service } = crearServicio();
    await service.crear(valido({ cantidad: 0 }));
    await service.crear(valido({ valor: '1', cantidad: 3, ubicacion: 'cajón 2', favorito: true }));
    await service.crear(valido({ valor: '2', categoria: 'LEDs', cantidad: 50, ubicacion: 'Caja LEDs' }));
    const e = await service.estadisticas();
    assert.equal(e.totalComponentes, 3);
    assert.equal(e.disponibles, 2);
    assert.equal(e.agotados, 1);
    assert.equal(e.stockBajo, 1);
    assert.equal(e.favoritos, 1);
    assert.equal(e.ubicaciones, 2);
    assert.deepEqual(e.porCategoria.find((c) => c.categoria === 'LEDs'), { categoria: 'LEDs', componentes: 1 });
  });
  it('importa lo válido e informa duplicados e inválidos sin frenar el lote', async () => {
    const { service } = crearServicio();
    await service.crear(valido());
    const r = await service.importar({
      componentes: [valido(), valido({ valor: '330 Ω' }), valido({ valor: '330 Ω' }), { nombre: '' }, valido({ valor: '1 kΩ', id: 'hack', estado: 'x' })],
    });
    assert.equal(r.recibidos, 5);
    assert.equal(r.importados, 2);
    assert.deepEqual(r.duplicados.map((d) => d.indice), [0, 2]);
    assert.deepEqual(r.invalidos.map((d) => d.indice), [3]);
    assert.equal((await service.listar(q(''))).meta.total, 3);
  });
  it('rechaza un cuerpo que no es una lista', async () => {
    const { service } = crearServicio();
    await assert.rejects(() => service.importar({ foo: 1 }), ValidationError);
  });
});
