export function getCookieValue(req: unknown, name: string) {
  const direct = (req as any)?.cookies?.[name];
  if (typeof direct === 'string') return direct;

  const cookieHeader = (req as any)?.headers?.cookie;
  if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) return null;
  const items = cookieHeader.split(';');
  for (const item of items) {
    const [rawKey, ...rest] = item.split('=');
    const key = rawKey?.trim();
    if (key !== name) continue;
    const value = rest.join('=').trim();
    return value.length > 0 ? decodeURIComponent(value) : '';
  }
  return null;
}

