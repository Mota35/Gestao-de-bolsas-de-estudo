export function isSafeHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password;
  } catch {
    return false;
  }
}

export function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function hostMatches(host: string, allowedDomain: string): boolean {
  return host === allowedDomain || host.endsWith(`.${allowedDomain}`);
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
