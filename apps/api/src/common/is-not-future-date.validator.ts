import { registerDecorator, ValidationOptions } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.+)?$/;

/** Date ISO (AAAA-MM-JJ ou horodatage) qui n'est pas dans le futur ; aujourd'hui est accepté (RG-GEN-01). */
export function IsNotFutureDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isNotFutureDate',
      target: target.constructor,
      propertyName: propertyName as string,
      options: { message: 'La date ne peut pas être dans le futur', ...options },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
          const time = Date.parse(value);
          // Une date seule vaut minuit UTC : « aujourd'hui » reste donc ≤ maintenant.
          return !Number.isNaN(time) && time <= Date.now();
        },
      },
    });
}
