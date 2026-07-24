// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { createAnonymousSession } from './authService';
import type { AuthorizedFetch } from './chatService';
import { listResources, uploadResource } from './resourcesService';

const BASE_URL = process.env.BACKEND_URL ?? 'http://localhost:8000/api';

let authorizedFetch: AuthorizedFetch;

beforeAll(async () => {
  const token = await createAnonymousSession(BASE_URL);
  authorizedFetch = (path, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${BASE_URL}${path}`, { ...init, headers });
  };
});

describe('resourcesService', () => {
  it('uploadResource persists the file - it shows up in listResources afterward', async () => {
    const file = new File(['%PDF-1.4 test content'], 'notes.pdf', { type: 'application/pdf' });

    const uploaded = await uploadResource(authorizedFetch, file, new AbortController().signal);

    const resources = await listResources(authorizedFetch);
    expect(resources.some(r => r.id === uploaded.id)).toBe(true);
  });

  it('aborting an in-flight upload actually cancels it - the file never appears in listResources', async () => {
    const filename = `aborted-${crypto.randomUUID()}.pdf`;
    const file = new File(['%PDF-1.4 this upload should not survive'], filename, { type: 'application/pdf' });
    const controller = new AbortController();

    const promise = uploadResource(authorizedFetch, file, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow();

    const resources = await listResources(authorizedFetch);
    expect(resources.some(r => r.filename === filename)).toBe(false);
  });
});
