import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Nombre fini à deux décimales au plus (NUMERIC(…,2)).
 * `IsNumber({ maxDecimalPlaces })` de class-validator lève une exception (donc un 500) pour 1e-7, que JavaScript
 * écrit en notation exponentielle : on compare plutôt le nombre à son arrondi au centime.
 */
export function HasMaxTwoDecimals(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'hasMaxTwoDecimals',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: 'Le nombre doit avoir deux décimales au plus', ...options },
      validator: {
        validate: (value: unknown): boolean =>
          typeof value === 'number' && Number.isFinite(value) && Math.round(value * 100) / 100 === value,
      },
    });
}
