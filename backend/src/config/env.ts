export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
}

export function getJwtSecret(): string {
  return requireEnv('JWT_SECRET');
}

export function getJwtExpiresIn(defaultValue: string): string {
  const value = process.env.JWT_EXPIRE;
  return value && value.trim() ? value : defaultValue;
}

