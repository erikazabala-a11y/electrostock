export interface DetalleCampo {
  campo: string;
  mensaje: string;
}

/** Error de negocio que el borde HTTP sabe traducir a una respuesta. */
export class AppError extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalles?: unknown;

  constructor(status: number, codigo: string, mensaje: string, detalles?: unknown) {
    super(mensaje);
    this.name = new.target.name;
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

export class ValidationError extends AppError {
  constructor(detalles: DetalleCampo[], mensaje = 'Los datos enviados no son válidos') {
    super(400, 'VALIDACION', mensaje, detalles);
  }
}

export class NotFoundError extends AppError {
  constructor(mensaje = 'Recurso no encontrado') {
    super(404, 'NO_ENCONTRADO', mensaje);
  }
}

export class ConflictError extends AppError {
  constructor(mensaje: string, detalles?: unknown) {
    super(409, 'DUPLICADO', mensaje, detalles);
  }
}

export class StorageError extends AppError {
  constructor(mensaje: string) {
    super(500, 'ALMACENAMIENTO', mensaje);
  }
}
