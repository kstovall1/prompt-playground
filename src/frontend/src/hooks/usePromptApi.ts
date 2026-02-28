import { useState, useEffect, useCallback } from 'react';
import type { PromptInfo, PromptVersion, PromptTemplate, CreatePromptResponse, SaveVersionResponse } from '../types';
import { apiFetch, useMutation } from './useApi';

export function usePrompts(catalog: string, schema: string) {
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!catalog || !schema) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ catalog, schema });
      const data = await apiFetch<{ prompts: PromptInfo[] }>(
        `/prompts?${params.toString()}`
      );
      setPrompts(data.prompts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [catalog, schema]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { prompts, loading, error, refresh };
}

export function usePromptVersions(name: string | null) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setVersions([]);
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ name });
      const data = await apiFetch<{ versions: PromptVersion[] }>(
        `/prompts/versions?${params.toString()}`
      );
      setVersions(data.versions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return { versions, loading, error, refresh: fetchVersions };
}

export function usePromptTemplate(name: string | null, version: string | null) {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name || !version) {
      setTemplate(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ name, version });
    apiFetch<PromptTemplate>(`/prompts/template?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setTemplate(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, version]);

  return { template, loading, error };
}

export function useCreatePrompt() {
  const { mutate: create, loading, error } = useMutation(
    (params: { name: string; template: string; description?: string }) =>
      apiFetch<CreatePromptResponse>('/prompts', {
        method: 'POST',
        body: JSON.stringify(params),
      })
  );
  return { create, loading, error };
}

export function useSaveVersion() {
  const { mutate: save, loading, error } = useMutation(
    (params: { name: string; template: string; description?: string }) =>
      apiFetch<SaveVersionResponse>('/prompts/versions', {
        method: 'POST',
        body: JSON.stringify(params),
      })
  );
  return { save, loading, error };
}
