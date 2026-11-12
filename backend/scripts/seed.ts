// Carga datos de ejemplo en data/componentes.json (omite los que ya existen).
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonFileComponentesRepository } from '../src/repositories/json-file.componentes.repository.ts';
import { ComponentesService } from '../src/services/componentes.service.ts';

const aqui = fileURLToPath(new URL('.', import.meta.url));
const archivo = resolve(process.env.DATA_FILE ?? resolve(aqui, '../data/componentes.json'));
const service = new ComponentesService(new JsonFileComponentesRepository(archivo));

const c = (
  nombre: string, categoria: string, valor: string, cantidad: number, unidad: string,
  ubicacion: string, fabricante = '', descripcion = '', fechaIncorporacion?: string, favorito = false,
) => ({ nombre, categoria, valor, cantidad, unidad, ubicacion, fabricante, descripcion, fechaIncorporacion, favorito });

const ejemplos = [
  c('Resistencia 220 Ω', 'Resistencias', '220 Ω', 100, 'unidades', 'Cajón 2', 'Yageo', '1/4 W, 5%', '2026-09-12'),
  c('Resistencia 10 kΩ', 'Resistencias', '10 kΩ', 85, 'unidades', 'Cajón 2', 'Yageo', '1/4 W, 5%', '2026-09-12'),
  c('Resistencia 1 kΩ', 'Resistencias', '1 kΩ', 4, 'unidades', 'Cajón 2', 'Yageo', '1/4 W, 5%', '2026-09-12'),
  c('Capacitor electrolítico', 'Capacitores', '100 μF', 30, 'unidades', 'Caja azul', 'Panasonic', '25 V', '2026-09-20'),
  c('Capacitor cerámico', 'Capacitores', '100 nF', 60, 'unidades', 'Caja azul', 'Murata', 'Desacople', '2026-09-20'),
  c('LED rojo 5mm', 'LEDs', 'Rojo', 3, 'unidades', 'Caja LEDs', '', 'Difuso', '2026-10-01'),
  c('LED verde 5mm', 'LEDs', 'Verde', 40, 'unidades', 'Caja LEDs', '', '', '2026-10-01'),
  c('LED RGB WS2812B', 'LEDs', '5 V', 0, 'unidades', 'Caja LEDs', 'Worldsemi', 'Direccionable', '2026-10-05'),
  c('Transistor 2N2222', 'Transistores', 'NPN', 25, 'unidades', 'Cajón 3', 'ON Semi', 'TO-92', '2026-09-30'),
  c('MOSFET IRLZ44N', 'Transistores', 'N-ch 55 V', 5, 'unidades', 'Cajón 3', 'Infineon', 'Nivel lógico', '2026-10-10', true),
  c('Arduino Uno R3', 'Microcontroladores', 'ATmega328P', 2, 'unidades', 'Estante 1', 'Arduino', 'Placa original', '2026-08-15', true),
  c('ESP32 DevKit V1', 'Microcontroladores', '30 pines', 6, 'unidades', 'Estante 1', 'Espressif', 'WiFi + Bluetooth', '2026-09-02', true),
  c('Raspberry Pi Pico', 'Microcontroladores', 'RP2040', 0, 'unidades', 'Estante 1', 'Raspberry Pi', '', '2026-10-20'),
  c('Sensor DHT22', 'Sensores', 'Temp/Humedad', 7, 'unidades', 'Caja sensores', 'Aosong', '', '2026-10-08'),
  c('Sensor ultrasónico HC-SR04', 'Sensores', '5 V', 4, 'unidades', 'Caja sensores', '', 'Distancia', '2026-10-08'),
  c('Sensor PIR HC-SR501', 'Sensores', '5 V', 9, 'unidades', 'Caja sensores', '', 'Movimiento', '2026-10-09'),
  c('Cable dupont macho-macho', 'Otros', '20 cm', 120, 'unidades', 'Cajón 1', '', '', '2026-08-20'),
  c('Cable AWG 22 rojo', 'Otros', '22 AWG', 12.5, 'metros', 'Estante 2', '', 'Sólido', '2026-09-01'),
  c('Estaño 60/40', 'Otros', '0,8 mm', 2, 'rollos', 'Estante 2', 'Kester', 'Con flux', '2026-07-30', true),
  c('Protoboard 830 puntos', 'Otros', '830', 5, 'unidades', 'Estante 2', '', '', '2026-08-01'),
  c('Pines header hembra', 'Otros', '40 pines', 8, 'paquetes', 'Cajón 1', '', '', '2026-09-25'),
  c('Diodo 1N4007', 'Otros', '1 A / 1000 V', 50, 'unidades', 'Cajón 3', 'Vishay', 'Rectificador', '2026-09-30'),
];

let creados = 0;
for (const ejemplo of ejemplos) {
  try {
    await service.crear(ejemplo);
    creados++;
  } catch (error) {
    if ((error as { codigo?: string }).codigo !== 'DUPLICADO') throw error;
  }
}
console.log(`Listo: ${creados} componentes de ejemplo cargados en ${archivo}`);
