import { ArgumentsHost } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { configuration } from '../config/configuration.js';
import { Prisma } from '../generated/prisma/client.js';
import { HasMaxTwoDecimals } from './has-max-two-decimals.validator.js';
import { IsNotFutureDate } from './is-not-future-date.validator.js';
import { NormalizedEmail } from './normalized-email.decorator.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

class DateDto {
  @IsNotFutureDate()
  date: string;
}

class EmailDto {
  @NormalizedEmail()
  email: string;
}

const isoDay = (offsetDays: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

describe('RG-GEN-01 date non future', () => {
  it("RG-GEN-01 accepte aujourd'hui, refuse demain", async () => {
    expect(await validate(plainToInstance(DateDto, { date: isoDay(0) }))).toHaveLength(0);
    expect(await validate(plainToInstance(DateDto, { date: isoDay(1) }))).toHaveLength(1);
  });

  it('RG-GEN-01 refuse un jour qui n’existe pas au lieu de le décaler (30 février)', async () => {
    expect(await validate(plainToInstance(DateDto, { date: '2025-02-30' }))).toHaveLength(1);
    expect(await validate(plainToInstance(DateDto, { date: '2025-02-30T10:00:00Z' }))).toHaveLength(1);
    expect(await validate(plainToInstance(DateDto, { date: '2024-02-29' }))).toHaveLength(0);
    // Un décalage horaire ne doit pas faire passer un jour valide pour inexistant.
    expect(await validate(plainToInstance(DateDto, { date: '2025-03-01T00:30:00+02:00' }))).toHaveLength(0);
  });

  it('RG-GEN-01 refuse l’année 0 (PostgreSQL la rejette) et les dates avant l’an 1000', async () => {
    expect(await validate(plainToInstance(DateDto, { date: '0000-01-01' }))).toHaveLength(1);
    expect(await validate(plainToInstance(DateDto, { date: '0999-12-31' }))).toHaveLength(1);
    expect(await validate(plainToInstance(DateDto, { date: '1000-01-01' }))).toHaveLength(0);
  });

  it("RG-GEN-01 refuse un texte qui n'est pas une date", async () => {
    expect(await validate(plainToInstance(DateDto, { date: 'hier' }))).toHaveLength(1);
    expect(await validate(plainToInstance(DateDto, { date: 20260101 }))).toHaveLength(1);
  });
});

class DecimalDto {
  @HasMaxTwoDecimals()
  value: unknown;
}

describe('HasMaxTwoDecimals', () => {
  const ok = async (value: unknown) => (await validate(plainToInstance(DecimalDto, { value }))).length === 0;

  it('RG-MON-07 accepte jusqu’à deux décimales', async () => {
    for (const value of [0, 1, 80.5, 12.35, 0.01, 99999999.99]) expect(await ok(value), String(value)).toBe(true);
  });

  it('RG-MON-07 refuse trois décimales ou plus, y compris en notation exponentielle (jamais d’exception)', async () => {
    for (const value of [12.345, 0.001, 0.0000001, 1e-10, 5e-324]) expect(await ok(value), String(value)).toBe(false);
  });

  it('refuse ce qui n’est pas un nombre fini', async () => {
    for (const value of ['80', NaN, Infinity, null, undefined, {}]) expect(await ok(value), typeof value).toBe(false);
  });
});

describe('email normalisé', () => {
  it('RG-CPT-13 normalise " Foo@Bar.FR " en "foo@bar.fr"', async () => {
    const dto = plainToInstance(EmailDto, { email: ' Foo@Bar.FR ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.email).toBe('foo@bar.fr');
  });

  it('RG-CPT-02 refuse un format d\'email invalide', async () => {
    for (const email of ['pas-un-email', 'a@', '@b.fr', '']) {
      expect(await validate(plainToInstance(EmailDto, { email }))).toHaveLength(1);
    }
  });

  it('RG-CPT-02 refuse un email de plus de 255 caractères', async () => {
    const long = `${'a'.repeat(250)}@b.fr`;
    expect(await validate(plainToInstance(EmailDto, { email: long }))).toHaveLength(1);
  });
});

describe('configuration', () => {
  const complete = {
    DATABASE_URL: 'postgresql://x',
    JWT_SESSION_SECRET: 's',
    JWT_LINK_SECRET: 'l',
    WEB_ORIGIN: 'http://localhost:5173',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1025',
    MAIL_FROM: 'no-reply@test.local',
  };

  it('la configuration échoue sans JWT_SESSION_SECRET', () => {
    const { JWT_SESSION_SECRET: _omitted, ...env } = complete;
    expect(() => configuration(env)).toThrow(/JWT_SESSION_SECRET/);
  });

  it('la configuration échoue sans JWT_LINK_SECRET', () => {
    const { JWT_LINK_SECRET: _omitted, ...env } = complete;
    expect(() => configuration(env)).toThrow(/JWT_LINK_SECRET/);
  });

  it('la configuration lit les valeurs et active le cookie Secure seulement sur demande', () => {
    expect(configuration(complete).cookieSecure).toBe(false);
    expect(configuration({ ...complete, COOKIE_SECURE: 'true' }).cookieSecure).toBe(true);
    expect(configuration(complete).smtpPort).toBe(1025);
  });

  it('le stockage des photos est local par défaut, dans ./uploads', () => {
    expect(configuration(complete).storage).toEqual({ driver: 'local', uploadDir: './uploads' });
    expect(configuration({ ...complete, UPLOAD_DIR: '/data/up' }).storage).toEqual({ driver: 'local', uploadDir: '/data/up' });
  });

  it('STORAGE_DRIVER=s3 exige les quatre réglages S3_*', () => {
    const s3 = { ...complete, STORAGE_DRIVER: 's3' };
    expect(() => configuration(s3)).toThrow(/S3_ENDPOINT/);
    expect(
      configuration({ ...s3, S3_ENDPOINT: 'https://s3.test', S3_BUCKET: 'b', S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 's' }).storage,
    ).toEqual({ driver: 's3', endpoint: 'https://s3.test', bucket: 'b', accessKey: 'a', secretKey: 's' });
  });

  it('un STORAGE_DRIVER inconnu est refusé au démarrage', () => {
    expect(() => configuration({ ...complete, STORAGE_DRIVER: 'ftp' })).toThrow(/STORAGE_DRIVER/);
  });
});

describe('PrismaExceptionFilter', () => {
  function run(code: string) {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;
    const error = new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test' });
    new PrismaExceptionFilter().catch(error, host);
    return { status, json };
  }

  it('une violation d\'unicité (P2002) répond 409', () => {
    const { status, json } = run('P2002');
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409, message: expect.any(String) }));
  });

  it('un enregistrement introuvable (P2025) répond 404', () => {
    const { status, json } = run('P2025');
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ statusCode: 404, code: 'NOT_FOUND', message: 'Ressource introuvable' });
  });

  it('une autre erreur Prisma répond 500 sans détail interne', () => {
    const { status, json } = run('P2003');
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('boom');
  });
});
