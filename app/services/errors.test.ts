// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AccessDeniedError, ensureOk, NotFoundError, parseJson, ServerError, UnauthorizedError } from './errors';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('parseJson', () => {
  it('returns the parsed body on success', async () => {
    await expect(parseJson(jsonResponse(200, { id: 'abc' }))).resolves.toEqual({ id: 'abc' });
  });

  it('throws UnauthorizedError for a 401, regardless of body', async () => {
    const err = await parseJson(jsonResponse(401, { detail: 'unauthorized' })).catch(e => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('throws AccessDeniedError for a 403', async () => {
    const err = await parseJson(jsonResponse(403, { error: 'forbidden' })).catch(e => e);
    expect(err).toBeInstanceOf(AccessDeniedError);
  });

  it('throws NotFoundError for a 404 and includes the backend code in the message', async () => {
    const err = await parseJson(jsonResponse(404, { error: 'chat_not_found' })).catch(e => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect((err as Error).message).toBe('Not found: chat_not_found');
  });

  it('throws ServerError for a 5xx and includes the backend detail when present', async () => {
    const err = await parseJson(jsonResponse(500, { error: 'internal_error' })).catch(e => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as Error).message).toBe('Server error: internal_error');
  });

  it('throws ServerError for a 5xx with a non-JSON body, falling back to the status', async () => {
    const html = new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const err = await parseJson(html).catch(e => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as Error).message).toBe('Server error (502)');
  });

  it('throws a plain Error for other statuses, with the backend code in the message', async () => {
    const err = await parseJson(jsonResponse(409, { error: 'last_assistant_message_not_finished' })).catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(UnauthorizedError);
    expect(err).not.toBeInstanceOf(AccessDeniedError);
    expect(err).not.toBeInstanceOf(NotFoundError);
    expect(err).not.toBeInstanceOf(ServerError);
    expect((err as Error).message).toBe('Request failed: last_assistant_message_not_finished');
  });

  it('throws a plain Error for other statuses with no body, falling back to the status', async () => {
    const err = await parseJson(new Response(null, { status: 422 })).catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('Request failed (422)');
  });
});

describe('ensureOk', () => {
  it('resolves without a body for a successful response', async () => {
    await expect(ensureOk(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it('throws the mapped exception for a non-ok response, without reading a body for 401/403', async () => {
    await expect(ensureOk(new Response(null, { status: 401 }))).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(ensureOk(new Response(null, { status: 403 }))).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it('throws NotFoundError for a 404 with no body', async () => {
    await expect(ensureOk(new Response(null, { status: 404 }))).rejects.toBeInstanceOf(NotFoundError);
  });
});
