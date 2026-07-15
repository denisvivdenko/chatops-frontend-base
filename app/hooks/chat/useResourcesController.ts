'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { Dispatch } from 'react';
import type { AppAction } from './appState';
import { createResourcesApi } from './resourcesApi';

const UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Orchestrates the document-library domain: upload lifecycle (start/success/failure),
 * the one-time library fetch, and cancel/retry. Holds no state of its own beyond the
 * in-flight AbortControllers and the original Files (needed to retry) - the reducer
 * is the source of truth for everything rendered. Stateless otherwise, same shape as
 * useChatController.
 */
export function useResourcesController(dispatch: Dispatch<AppAction>, baseUrl: string, isLoaded: boolean) {
  const api = useMemo(() => createResourcesApi(baseUrl), [baseUrl]);
  const controllers = useRef(new Map<string, AbortController>());
  const files = useRef(new Map<string, File>());

  const runUpload = useCallback((id: string, file: File) => {
    const abort = new AbortController();
    controllers.current.set(id, abort);
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(UPLOAD_TIMEOUT_MS)]);

    api.uploadResource(file, signal)
      .then(resource => {
        controllers.current.delete(id);
        dispatch({ type: 'resourceUploadSucceeded', id, resourceId: resource.id });
      })
      .catch(() => {
        controllers.current.delete(id);
        // User-cancelled: the card was already removed by cancelUpload, nothing to flip to failed.
        if (abort.signal.aborted) return;
        dispatch({ type: 'resourceUploadFailed', id, error: 'Upload failed.' });
      });
  }, [api, dispatch]);

  const ensureLoaded = useCallback(() => {
    if (isLoaded) return;
    api.listResources().then(resources => {
      dispatch({
        type: 'resourcesLoaded',
        resources: resources.map(r => ({ id: r.id, resourceId: r.id, filename: r.filename, status: 'ready' as const })),
      });
    });
  }, [isLoaded, api, dispatch]);

  const uploadResource = useCallback((file: File): string => {
    const id = crypto.randomUUID();
    files.current.set(id, file);
    dispatch({ type: 'resourceUploadStarted', id, filename: file.name });
    runUpload(id, file);
    return id;
  }, [dispatch, runUpload]);

  const cancelUpload = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    files.current.delete(id);
    dispatch({ type: 'resourceRemoved', id });
  }, [dispatch]);

  const retryUpload = useCallback((id: string) => {
    const file = files.current.get(id);
    if (!file) return;
    dispatch({ type: 'resourceUploadRetried', id });
    runUpload(id, file);
  }, [dispatch, runUpload]);

  const removeResource = useCallback((id: string) => {
    controllers.current.delete(id);
    files.current.delete(id);
    dispatch({ type: 'resourceRemoved', id });
  }, [dispatch]);

  return { ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource };
}
