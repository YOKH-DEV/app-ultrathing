import { describe, expect, it } from 'vitest';
import {
  DESKTOP_OAUTH_PENDING_STORAGE_KEY,
  DESKTOP_OAUTH_PENDING_TTL_MS,
  canExchangeDesktopOAuthCode,
  clearDesktopOAuthPending,
  loadDesktopOAuthPending,
  saveDesktopOAuthPending,
} from './desktopOAuthPending';

const FLOW_A = '123e4567-e89b-42d3-a456-426614174000';
const FLOW_B = '987fcdeb-51a2-43d7-b654-123456789abc';
const NOW = 1_800_000_000_000;

function createStorage(initial?: string): Storage {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(DESKTOP_OAUTH_PENDING_STORAGE_KEY, initial);

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

describe('desktopOAuthPending', () => {
  it('rehidrata un intento vigente para continuar un arranque en frío', () => {
    const storage = createStorage();
    const pending = { flowId: FLOW_A, createdAt: NOW - 1_000 };
    saveDesktopOAuthPending(storage, pending);

    expect(loadDesktopOAuthPending(storage, NOW)).toEqual(pending);
  });

  it.each([
    '{broken',
    'null',
    '{}',
    JSON.stringify({ flowId: 'not-a-uuid', createdAt: NOW }),
    JSON.stringify({ flowId: FLOW_A, createdAt: 'today' }),
    JSON.stringify({ flowId: FLOW_A, createdAt: NOW, extra: true }),
  ])('descarta y limpia estado corrupto: %s', (raw) => {
    const storage = createStorage(raw);

    expect(loadDesktopOAuthPending(storage, NOW)).toBeNull();
    expect(storage.getItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY)).toBeNull();
  });

  it('descarta y limpia un intento al alcanzar el TTL', () => {
    const storage = createStorage(
      JSON.stringify({
        flowId: FLOW_A,
        createdAt: NOW - DESKTOP_OAUTH_PENDING_TTL_MS,
      }),
    );

    expect(loadDesktopOAuthPending(storage, NOW)).toBeNull();
    expect(storage.getItem(DESKTOP_OAUTH_PENDING_STORAGE_KEY)).toBeNull();
  });

  it('no permite que la limpieza de A borre el intento B', () => {
    const storage = createStorage();
    const pendingB = { flowId: FLOW_B, createdAt: NOW };
    saveDesktopOAuthPending(storage, pendingB);

    clearDesktopOAuthPending(storage, FLOW_A);

    expect(loadDesktopOAuthPending(storage, NOW)).toEqual(pendingB);
  });

  it('acepta B, ignora el callback tardío de A y bloquea el duplicado de B', () => {
    const pendingB = { flowId: FLOW_B, createdAt: NOW };

    expect(canExchangeDesktopOAuthCode(pendingB, FLOW_A, new Set(), NOW)).toBe(false);
    expect(canExchangeDesktopOAuthCode(pendingB, FLOW_B, new Set(), NOW)).toBe(true);
    expect(canExchangeDesktopOAuthCode(pendingB, FLOW_B, new Set([FLOW_B]), NOW)).toBe(false);
  });
});
