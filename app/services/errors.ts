export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class AccessDeniedError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends Error {
  constructor(message = 'Server error') {
    super(message);
    this.name = 'ServerError';
  }
}

async function readDetail(res: Response): Promise<string | undefined> {
  try {
    const body: unknown = await res.json();
    if (typeof body !== 'object' || body === null) return undefined;
    if ('error' in body && typeof body.error === 'string') return body.error;
    if ('detail' in body && typeof body.detail === 'string') return body.detail;
  } catch {
    // Not JSON at all (e.g. an upstream proxy's HTML error page) - no detail to report.
  }
  return undefined;
}

async function toError(res: Response): Promise<Error> {
  if (res.status === 401) return new UnauthorizedError();
  if (res.status === 403) return new AccessDeniedError();

  const detail = await readDetail(res);
  if (res.status === 404) return new NotFoundError(detail ? `Not found: ${detail}` : 'Not found');
  if (res.status >= 500) return new ServerError(detail ? `Server error: ${detail}` : `Server error (${res.status})`);
  return new Error(detail ? `Request failed: ${detail}` : `Request failed (${res.status})`);
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw await toError(res);
  return res.json() as Promise<T>;
}

export async function ensureOk(res: Response): Promise<void> {
  if (!res.ok) throw await toError(res);
}
