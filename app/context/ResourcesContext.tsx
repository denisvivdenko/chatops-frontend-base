'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useBackendApi } from '../hooks/useBackendApi';

export type ResourceItem = {
  id: string; // local id, stable across the item's lifetime
  filename: string;
  status: 'uploading' | 'ready' | 'failed';
  resourceId: string | null; // server id, set once upload succeeds
  error?: string;
};

interface ResourcesState {
  items: ResourceItem[];
}

interface ResourcesActions {
  ensureLoaded: () => void;
  uploadResource: (file: File) => string; // returns the local id immediately
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  removeResource: (id: string) => void;
}

const ResourcesStateContext = createContext<ResourcesState | undefined>(undefined);
const ResourcesActionsContext = createContext<ResourcesActions | undefined>(undefined);

export function ResourcesProvider({ children }: { children: ReactNode }) {
  const backendApi = useBackendApi();
  const [items, setItems] = useState<ResourceItem[]>([]);

  // Non-state refs: these hold things that shouldn't trigger re-renders
  // and aren't serializable as state (Files, in-flight abort handles).
  const filesRef = useRef<Map<string, File>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const loadedRef = useRef(false);

  const ensureLoaded = useCallback(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    backendApi.listResources().then((resources) => {
      setItems((prev) => {
        const existingResourceIds = new Set(prev.map((i) => i.resourceId));
        const loaded: ResourceItem[] = resources
          .filter((r) => !existingResourceIds.has(r.id))
          .map((r) => ({
            id: r.id,
            filename: r.filename,
            status: 'ready',
            resourceId: r.id,
          }));
        return [...prev, ...loaded];
      });
    });
  }, [backendApi]);

  const runUpload = useCallback(
    (id: string, file: File) => {
      const controller = new AbortController();
      controllersRef.current.set(id, controller);

      backendApi
        .uploadResource(file, controller.signal)
        .then((resource) => {
          controllersRef.current.delete(id);
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: 'ready', resourceId: resource.id, error: undefined }
                : item
            )
          );
        })
        .catch((err) => {
          controllersRef.current.delete(id);
          if (controller.signal.aborted) return; // cancelled — item already removed
          setItems((prev) =>
            prev.map((item) =>
              item.id === id
                ? { ...item, status: 'failed', error: (err as Error).message }
                : item
            )
          );
        });
    },
    [backendApi]
  );

  const uploadResource = useCallback(
    (file: File) => {
      const id = crypto.randomUUID();
      filesRef.current.set(id, file);

      setItems((prev) => [
        ...prev,
        { id, filename: file.name, status: 'uploading', resourceId: null },
      ]);

      runUpload(id, file);
      return id;
    },
    [runUpload]
  );

  const cancelUpload = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    filesRef.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const file = filesRef.current.get(id);
      if (!file) return; // no original file to retry (e.g. a server-loaded item)

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'uploading', error: undefined } : item
        )
      );
      runUpload(id, file);
    },
    [runUpload]
  );

  const removeResource = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    filesRef.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const state = useMemo<ResourcesState>(() => ({ items }), [items]);

  const actions = useMemo<ResourcesActions>(
    () => ({ ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource }),
    [ensureLoaded, uploadResource, cancelUpload, retryUpload, removeResource]
  );

  return (
    <ResourcesStateContext.Provider value={state}>
      <ResourcesActionsContext.Provider value={actions}>
        {children}
      </ResourcesActionsContext.Provider>
    </ResourcesStateContext.Provider>
  );
}

export function useResources() {
  const stateCtx = useContext(ResourcesStateContext);
  const actionsCtx = useContext(ResourcesActionsContext);
  if (!stateCtx || !actionsCtx) {
    throw new Error('useResources must be used within ResourcesProvider');
  }
  return { ...stateCtx, ...actionsCtx };
}