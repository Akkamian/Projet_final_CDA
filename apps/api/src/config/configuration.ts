export type StorageConfig =
  | { driver: 'local'; uploadDir: string }
  | { driver: 's3'; endpoint: string; bucket: string; accessKey: string; secretKey: string };

export interface AppConfig {
  webOrigin: string;
  jwtSessionSecret: string;
  jwtLinkSecret: string;
  cookieSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  /** TLS implicite (port 465) ; sinon STARTTLS si le serveur le propose. */
  smtpSecure: boolean;
  /** Identifiants du relais ; absents en développement (MailDev). */
  smtpAuth?: { user: string; pass: string };
  mailFrom: string;
  throttleLimit: number;
  throttleTtlSeconds: number;
  storage: StorageConfig;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export function storageConfig(env: NodeJS.ProcessEnv): StorageConfig {
  const driver = env.STORAGE_DRIVER || 'local';
  if (driver === 'local') return { driver, uploadDir: env.UPLOAD_DIR || './uploads' };
  if (driver === 's3') {
    return {
      driver,
      endpoint: required(env, 'S3_ENDPOINT'),
      bucket: required(env, 'S3_BUCKET'),
      accessKey: required(env, 'S3_ACCESS_KEY'),
      secretKey: required(env, 'S3_SECRET_KEY'),
    };
  }
  throw new Error(`STORAGE_DRIVER inconnu : ${driver} (local ou s3)`);
}

function smtpAuth(env: NodeJS.ProcessEnv): AppConfig['smtpAuth'] {
  if (!env.SMTP_USER) return undefined;
  return { user: env.SMTP_USER, pass: required(env, 'SMTP_PASS') };
}

/** Lit l'environnement ; échoue au démarrage si un secret ou un réglage obligatoire manque. */
export function configuration(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    webOrigin: required(env, 'WEB_ORIGIN'),
    jwtSessionSecret: required(env, 'JWT_SESSION_SECRET'),
    jwtLinkSecret: required(env, 'JWT_LINK_SECRET'),
    cookieSecure: env.COOKIE_SECURE === 'true',
    smtpHost: required(env, 'SMTP_HOST'),
    smtpPort: Number(required(env, 'SMTP_PORT')),
    smtpSecure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : env.SMTP_PORT === '465',
    smtpAuth: smtpAuth(env),
    mailFrom: required(env, 'MAIL_FROM'),
    // Tentatives autorisées par IP et par fenêtre (RG-CPT-14) : 5 par minute par défaut.
    throttleLimit: Number(env.THROTTLE_LIMIT || 5),
    throttleTtlSeconds: Number(env.THROTTLE_TTL_SECONDS || 60),
    storage: storageConfig(env),
  };
}
