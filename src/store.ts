import { useState, useCallback } from "react";

export interface FileTag {
  name: string;
  color: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
  paths: string[];
  tags: string[];
  createdAt: number;
}

export interface AppStore {
  projects: ProjectEntry[];
  tags: FileTag[];
  savedPaths: string[];
}

const STORE_KEY = "open-files:store";

const DEFAULT_STORE: AppStore = {
  projects: [],
  tags: [],
  savedPaths: [],
};

function loadStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_STORE };
    return { ...DEFAULT_STORE, ...(JSON.parse(raw) as Partial<AppStore>) };
  } catch {
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store: AppStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function useStore() {
  const [store, setStoreState] = useState<AppStore>(loadStore);

  const updateStore = useCallback((updater: (prev: AppStore) => AppStore) => {
    setStoreState((prev) => {
      const next = updater(prev);
      saveStore(next);
      return next;
    });
  }, []);

  const toggleSavedPath = useCallback(
    (path: string) => {
      updateStore((prev) => {
        const saved = prev.savedPaths.includes(path)
          ? prev.savedPaths.filter((p) => p !== path)
          : [...prev.savedPaths, path];
        return { ...prev, savedPaths: saved };
      });
    },
    [updateStore],
  );

  const createProject = useCallback(
    (name: string) => {
      const entry: ProjectEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        paths: [],
        tags: [],
        createdAt: Date.now(),
      };
      updateStore((prev) => ({ ...prev, projects: [...prev.projects, entry] }));
    },
    [updateStore],
  );

  const renameProject = useCallback(
    (id: string, name: string) => {
      updateStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, name } : p)),
      }));
    },
    [updateStore],
  );

  const deleteProject = useCallback(
    (id: string) => {
      updateStore((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
      }));
    },
    [updateStore],
  );

  const addTag = useCallback(
    (tag: FileTag) => {
      updateStore((prev) => {
        if (prev.tags.find((t) => t.name === tag.name)) return prev;
        return { ...prev, tags: [...prev.tags, tag] };
      });
    },
    [updateStore],
  );

  const removeTag = useCallback(
    (name: string) => {
      updateStore((prev) => ({
        ...prev,
        tags: prev.tags.filter((t) => t.name !== name),
      }));
    },
    [updateStore],
  );

  const addToProject = useCallback(
    (projectId: string, path: string) => {
      updateStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId && !p.paths.includes(path)
            ? { ...p, paths: [...p.paths, path] }
            : p,
        ),
      }));
    },
    [updateStore],
  );

  const removeFromProject = useCallback(
    (projectId: string, path: string) => {
      updateStore((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? { ...p, paths: p.paths.filter((fp) => fp !== path) }
            : p,
        ),
      }));
    },
    [updateStore],
  );

  return {
    store,
    toggleSavedPath,
    createProject,
    renameProject,
    deleteProject,
    addTag,
    removeTag,
    addToProject,
    removeFromProject,
  };
}
