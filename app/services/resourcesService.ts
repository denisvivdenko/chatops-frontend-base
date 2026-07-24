import { HttpError, type AuthorizedFetch } from './chatService';

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

export async function listResources(authorizedFetch: AuthorizedFetch): Promise<ResourceSummary[]> {
  const res = await authorizedFetch('/resources');
  const data = await parseJson<RawResource[]>(res);
  return data.map(mapResource);
}

export async function uploadResource(authorizedFetch: AuthorizedFetch, file: File, signal: AbortSignal): Promise<ResourceSummary> {
  const body = new FormData();
  body.append('file', file);
  const res = await authorizedFetch('/upload-resource', { method: 'POST', body, signal });
  return mapResource(await parseJson<RawResource>(res));
}
