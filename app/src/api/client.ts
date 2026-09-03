export function groupBase(serverUrl: string, token: string): string {
  return `${serverUrl.replace(/\/$/, '')}/api/groups/${token}`;
}

export function serverBase(serverUrl: string): string {
  return `${serverUrl.replace(/\/$/, '')}/api`;
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase() ?? 'GET';
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH';

  const headers: HeadersInit = {
    ...(isWrite ? { 'Content-Type': 'application/json' } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const text = await response.text();

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // ignore parse errors, use default message
    }
    throw new Error(message);
  }

  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}
