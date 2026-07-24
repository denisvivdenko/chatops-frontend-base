import { HttpError, type SessionFetch } from './chatService';

/**
 * Transport layer for the document library (Phase A - upload only). Sibling to
 * chatService.ts: same domain-objects-in/HttpError-out shape, no reducer/React here.
 */

type RawResource = { id: string; filename: string };

export type ResourceSummary = { id: string; filename: string };

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

function mapResource(raw: RawResource): ResourceSummary {
  return { id: raw.id, filename: raw.filename };
}

export type ResourcesApi = ReturnType<typeof createResourcesApi>;

export function createResourcesApi(sessionFetch: SessionFetch) {
  return {
    async listResources(): Promise<ResourceSummary[]> {
      const res = await sessionFetch('/resources');
      const data = await parseJson<RawResource[]>(res);
      return data.map(mapResource);
    },

    async uploadResource(file: File, signal: AbortSignal): Promise<ResourceSummary> {
      const body = new FormData();
      body.append('file', file);
      const res = await sessionFetch('/upload-resource', { method: 'POST', body, signal });
      return mapResource(await parseJson<RawResource>(res));
    },
  };
}
