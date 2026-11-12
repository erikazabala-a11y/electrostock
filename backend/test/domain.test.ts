import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calcularEstado, claveUnica, errorDeCantidad, esStockBajo, hoyISO, normalizar } from '../src/domain/componente.ts';

describe('dominio', () => {
  it('normalizar ignora mayúsculas, tildes y espacios', () => {
    assert.equal(normalizar('  Capacitór   ELECTROLÍTICO '), 'capacitor electrolitico');
  });
  it('claveUnica combina nombre + valor + fabricante normalizados', () => {
    assert.equal(
      claveUnica({ nombre: 'LED  Rojo', valor: 'Rójo', fabricante: 'ACME' }),
      claveUnica({ nombre: 'led rojo', valor: 'rojo', fabricante: ' acme ' }),
    );
  });
  it('estado derivado de la cantidad (RN3)', () => {
    assert.equal(calcularEstado(1), 'Disponible');
    assert.equal(calcularEstado(0), 'Agotado');
  });
  it('stock bajo: 0 < cantidad <= umbral; agotado no cuenta (RN4)', () => {
    assert.equal(esStockBajo(0, 5), false);
    assert.equal(esStockBajo(1, 5), true);
    assert.equal(esStockBajo(5, 5), true);
    assert.equal(esStockBajo(6, 5), false);
  });
  it('cantidad coherente con la unidad (RN5)', () => {
    assert.equal(errorDeCantidad(-1, 'metros'), 'No puede ser negativa');
    assert.match(errorDeCantidad(2.5, 'unidades') ?? '', /entero/);
    assert.equal(errorDeCantidad(2.5, 'metros'), null);
  });
  it('hoyISO formatea con ceros', () => {
    assert.equal(hoyISO(new Date(2026, 0, 5)), '2026-01-05');
  });
});
