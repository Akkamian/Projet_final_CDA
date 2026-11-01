export interface AppConfig {
  webOrigin: string;
  jwtSessionSecret: string;
  jwtLinkSecret: string;
  cookieSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  mailFrom: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
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
    mailFrom: required(env, 'MAIL_FROM'),
  };
}
