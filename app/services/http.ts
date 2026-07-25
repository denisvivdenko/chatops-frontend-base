/**
 * What every service in this layer needs to talk to the backend: the transport seam
 * it calls through, and the error it raises when a response comes back non-ok.
 *
 * The backend runs two error conventions (api.md §6): business-rule failures carry
 * `{"error": "<snake_case_code>"}`, while auth failures and FastAPI validation errors
 * use `{"detail": ...}` and carry no code at all. `code` is therefore best-effort -
 * reliably present for the former, absent for the latter - so callers should branch
 * on it only where it adds something `status` alone can't say.
 */

/** Shape `useSession`'s sessionFetch fulfills - the one way this layer reaches the backend. */
export type SessionFetch = (path: string, init?: RequestInit) => Promise<Response>;

export type ErrorCode =
  | 'forbidden'
  | 'chat_not_found'
  | 'message_not_found'
  | 'resource_not_found'
  | 'last_assistant_message_not_finished'
  | 'message_not_failed'
  | 'cannot_modify_assistant_message'
  | 'invalid_file_type'
  | 'file_too_large';

export class HttpError extends Error {
  constructor(public status: number, public code?: ErrorCode, message?: string) {
    super(message ?? `Request failed with status ${status}${code ? ` (${code})` : ''}`);
    this.name = 'HttpError';
  }
}

async function readErrorCode(res: Response): Promise<ErrorCode | undefined> {
  try {
    const body: unknown = await res.json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error as ErrorCode;
    }
  } catch {
    // Not JSON at all (an upstream proxy's HTML 502, say). Building the error must
    // never itself throw, so the status is simply all we report.
  }
  return undefined;
}

/** Builds the error for a non-ok response, reading its body for an error code. */
export async function httpError(res: Response, message?: string): Promise<HttpError> {
  return new HttpError(res.status, await readErrorCode(res), message);
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw await httpError(res);
  return res.json();
}
