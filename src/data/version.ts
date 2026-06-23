// Single source of truth for app version
// Increment this when creating a new tar.gz backup
// Keep in sync with: degencup2026-v{VERSION}.tar.gz
export const VERSION = 'v73';

export function getVersion(): string {
  return VERSION;
}
