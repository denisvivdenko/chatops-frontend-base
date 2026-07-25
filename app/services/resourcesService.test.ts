// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import type { SessionFetch } from './http';
import { HttpError } from './http';
import { createResourcesApi } from './resourcesService';
import { createSessionFetch } from './testUtils';

let sessionFetch: SessionFetch;

const pdf = (content: string, filename: string) =>
  new File([`%PDF-1.4 ${content}`], filename, { type: 'application/pdf' });

beforeAll(async () => {
  sessionFetch = await createSessionFetch();
});

describe('resourcesService', () => {
  it('uploadResource persists the file - it shows up in listResources afterward', async () => {
    const api = createResourcesApi(sessionFetch);

    const uploaded = await api.uploadResource(pdf('test content', 'notes.pdf'), new AbortController().signal);
    expect(uploaded.id).toBeTruthy();
    expect(uploaded.filename).toBe('notes.pdf');

    const resources = await api.listResources();
    expect(resources.some(r => r.id === uploaded.id)).toBe(true);
  });

  it('uploadResource rejects a file without the PDF magic bytes with a 400', async () => {
    const api = createResourcesApi(sessionFetch);
    const notAPdf = new File(['plain text pretending to be a pdf'], 'fake.pdf', { type: 'application/pdf' });

    let error: unknown;
    try {
      await api.uploadResource(notAPdf, new AbortController().signal);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
    expect((error as HttpError).code).toBe('invalid_file_type');
  });

  it('re-uploading the same filename replaces the previous resource rather than duplicating it', async () => {
    const api = createResourcesApi(sessionFetch);
    const filename = `replaced-${crypto.randomUUID()}.pdf`;

    const first = await api.uploadResource(pdf('first version', filename), new AbortController().signal);
    const second = await api.uploadResource(pdf('second version', filename), new AbortController().signal);

    expect(second.id).not.toBe(first.id);

    const resources = await api.listResources();
    expect(resources.filter(r => r.filename === filename)).toHaveLength(1);
    expect(resources.some(r => r.id === first.id)).toBe(false);
  });

  it('aborting before the request is sent rejects with an AbortError and uploads nothing', async () => {
    const api = createResourcesApi(sessionFetch);
    const filename = `aborted-early-${crypto.randomUUID()}.pdf`;
    const controller = new AbortController();

    const promise = api.uploadResource(pdf('this upload should not survive', filename), controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));

    const resources = await api.listResources();
    expect(resources.some(r => r.filename === filename)).toBe(false);
  });

  it('aborting an upload already in flight cancels it - the file never appears in listResources', async () => {
    const api = createResourcesApi(sessionFetch);
    const filename = `aborted-inflight-${crypto.randomUUID()}.pdf`;
    // Large enough that the body is still being written when the abort lands.
    const file = pdf('x'.repeat(8 * 1024 * 1024), filename);
    const controller = new AbortController();

    const promise = api.uploadResource(file, controller.signal);
    await new Promise(resolve => setTimeout(resolve, 0));
    controller.abort();

    await expect(promise).rejects.toThrow(expect.objectContaining({ name: 'AbortError' }));

    const resources = await api.listResources();
    expect(resources.some(r => r.filename === filename)).toBe(false);
  });
});
