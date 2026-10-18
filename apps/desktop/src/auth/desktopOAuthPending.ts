export const DESKTOP_OAUTH_PENDING_STORAGE_KEY = 'ultrathing-desktop-oauth-pending-v1';
export const DESKTOP_OAUTH_PENDING_TTL_MS = 5 * 60 * 1_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DesktopOAuthPending = Readonly<{
  flowId: string;
  createdAt: number;
}>;

export function isDesktopOAuthFlowId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isPending(value: unknown): value is DesktopOAuthPending {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 2 &&
    typeof record.flowId === 'string' &&
    isDesktopOAuthFlowId(record.flowId) &&
    typeof record.createdAt === 'number' &&
    Number.isSafeInteger(record.createdAt) &&
    record.createdAt >= 0
  );
}

function parsePending(raw: string): DesktopOAuthPending | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isPending(value) ? value : null;
  } catch {
    return null;
  }
}

export function matchesDesktopOAuthPending(
  pending: DesktopOAuthPending | null,
  flowId: string,
  now = Date.now(),
): boolean {
  if (!isPending(pending) || !isDesktopOAuthFlowId(flowId)) return false;
  const age = now - pending.createdAt;
  return pending.flowId === flowId && age >= 0 && age < DESKTOP_OAUTH_PENDING_TTL_MS;
}

export function saveDesktopOAuthPending(storage: Storage, pending: DesktopOAuthPending): void {
  if (!isPending(pending)) {
    throw new Error('No se pudo guardar un intento de acceso válido.');
  }
  storage.setItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY, JSON.stringify(pending));
}

export function loadDesktopOAuthPending(
  storage: Storage,
  now = Date.now(),
): DesktopOAuthPending | null {
  const raw = storage.getItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY);
  if (raw === null) return null;

  const pending = parsePending(raw);
  if (!pending || !matchesDesktopOAuthPending(pending, pending.flowId, now)) {
    storage.removeItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY);
    return null;
  }
  return pending;
}

export function clearDesktopOAuthPending(storage: Storage, expectedFlowId: string): void {
  const raw = storage.getItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY);
  if (raw === null) return;

  const pending = parsePending(raw);
  if (!pending || pending.flowId === expectedFlowId) {
    storage.removeItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY);
  }
}

export function canExchangeDesktopOAuthCode(
  pending: DesktopOAuthPending | null,
  flowId: string,
  exchangingFlowIds: ReadonlySet<string>,
  now = Date.now(),
): boolean {
  return matchesDesktopOAuthPending(pending, flowId, now) && !exchangingFlowIds.has(flowId);
}
