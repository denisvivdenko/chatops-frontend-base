// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { httpError, parseJson } from './http';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpError', () => {
  it('reads the code from the business-rule error convention', async () => {
    const err = await httpError(jsonResponse(409, { error: 'last_assistant_message_not_finished' }));

    expect(err.status).toBe(409);
    expect(err.code).toBe('last_assistant_message_not_finished');
  });

  it('leaves code undefined for the auth convention, which carries no code', async () => {
    const err = await httpError(jsonResponse(401, { detail: 'unauthorized' }));

    expect(err.status).toBe(401);
    expect(err.code).toBeUndefined();
  });

  it('leaves code undefined for FastAPI validation errors, whose detail is an array', async () => {
    const err = await httpError(jsonResponse(422, { detail: [{ loc: ['body'], msg: 'field required' }] }));

    expect(err.status).toBe(422);
    expect(err.code).toBeUndefined();
  });

  it('survives a non-JSON body rather than throwing while building the error', async () => {
    const html = new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    const err = await httpError(html);

    expect(err.status).toBe(502);
    expect(err.code).toBeUndefined();
  });

  it('survives an empty body', async () => {
    const err = await httpError(new Response(null, { status: 500 }));

    expect(err.status).toBe(500);
    expect(err.code).toBeUndefined();
  });

  it('keeps a caller-supplied message while still reporting the code', async () => {
    const err = await httpError(jsonResponse(404, { error: 'chat_not_found' }), 'Failed to load chat: 404');

    expect(err.message).toBe('Failed to load chat: 404');
    expect(err.code).toBe('chat_not_found');
  });

  it('parseJson returns the parsed body on success and throws the coded error otherwise', async () => {
    await expect(parseJson(jsonResponse(200, { id: 'abc' }))).resolves.toEqual({ id: 'abc' });

    await expect(parseJson(jsonResponse(403, { error: 'forbidden' }))).rejects.toThrow(
      expect.objectContaining({ status: 403, code: 'forbidden' }),
    );
  });
});
