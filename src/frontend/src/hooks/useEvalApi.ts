import { useState, useEffect, useCallback } from 'react';
import type { ExperimentInfo, JudgeInfo, EvalResponse } from '../types';
import { apiFetch, useMutation } from './useApi';

export function useExperiments(catalog: string = '', schema: string = '') {
  const [experiments, setExperiments] = useState<ExperimentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (catalog) params.set('catalog', catalog);
      if (schema) params.set('schema', schema);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch<{ experiments: ExperimentInfo[] }>(`/eval/experiments${query}`);
      setExperiments(data.experiments);
    } catch {
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, [catalog, schema]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { experiments, loading, refresh };
}

export function useExperimentPrompts(experimentName: string) {
  const [promptNames, setPromptNames] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPromptNames(null);
    if (!experimentName) return;
    setLoading(true);
    const params = new URLSearchParams({ experiment_name: experimentName });
    apiFetch<{ prompt_names: string[] }>(`/eval/experiments/prompts?${params.toString()}`)
      .then((d) => setPromptNames(d.prompt_names.length > 0 ? d.prompt_names : null))
      .catch(() => setPromptNames(null))
      .finally(() => setLoading(false));
  }, [experimentName]);

  return { promptNames, loading };
}

export function useJudges(experimentName: string) {
  const [judges, setJudges] = useState<JudgeInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!experimentName) {
      setJudges([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ experiment_name: experimentName });
    apiFetch<{ judges: JudgeInfo[] }>(`/eval/judges?${params.toString()}`)
      .then((d) => setJudges(d.judges))
      .catch(() => setJudges([]))
      .finally(() => setLoading(false));
  }, [experimentName]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { judges, loading, refresh };
}

export function useCreateJudge() {
  const { mutate: create, loading, error } = useMutation(
    (params: {
      name: string;
      type?: 'custom' | 'guidelines';
      instructions?: string;
      guidelines?: string[];
      experiment_name?: string;
      is_update?: boolean;
    }) =>
      apiFetch<{ name: string; status: string }>('/eval/judges', {
        method: 'POST',
        body: JSON.stringify(params),
      })
  );
  return { create, loading, error };
}

export interface JudgeDetail {
  name: string;
  type: 'custom' | 'guidelines';
  instructions: string | null;
  guidelines: string[] | null;
}

export function useJudgeDetail(name: string | null) {
  const [detail, setDetail] = useState<JudgeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) { setDetail(null); return; }
    setLoading(true);
    const params = new URLSearchParams({ name });
    apiFetch<JudgeDetail>(`/eval/judges/detail?${params.toString()}`)
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [name]);

  return { detail, loading };
}

export function useDeleteJudge() {
  const { mutate: deleteJudge, loading, error } = useMutation(
    (params: { name: string; experiment_name?: string }) => {
      const qs = new URLSearchParams({ name: params.name });
      if (params.experiment_name) qs.set('experiment_name', params.experiment_name);
      return apiFetch<{ name: string; status: string }>(`/eval/judges?${qs.toString()}`, {
        method: 'DELETE',
      });
    }
  );
  return { deleteJudge, loading, error };
}

export function useEvalTables(catalog: string, schema: string) {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catalog || !schema) return;
    setLoading(true);
    const params = new URLSearchParams({ catalog, schema });
    apiFetch<{ tables: { name: string }[] }>(`/eval/tables?${params.toString()}`)
      .then((d) => setTables(d.tables.map((t) => t.name)))
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  }, [catalog, schema]);

  return { tables, loading };
}

export function useEvalColumns(catalog: string, schema: string, table: string | null) {
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!table) { setColumns([]); return; }
    setLoading(true);
    const params = new URLSearchParams({ catalog, schema, table });
    apiFetch<{ columns: string[] }>(`/eval/columns?${params.toString()}`)
      .then((d) => setColumns(d.columns))
      .catch(() => setColumns([]))
      .finally(() => setLoading(false));
  }, [catalog, schema, table]);

  return { columns, loading };
}

export function useRunEval() {
  const [result, setResult] = useState<EvalResponse | null>(null);

  const { mutate, loading, error } = useMutation(
    async (params: {
      prompt_name: string;
      prompt_version: string;
      model_name: string;
      dataset_catalog: string;
      dataset_schema: string;
      dataset_table: string;
      column_mapping: Record<string, string>;
      max_rows?: number;
      temperature?: number;
      experiment_name?: string;
      scorer_name?: string;
      judge_model?: string;
      judge_temperature?: number;
    }) => {
      setResult(null);
      const data = await apiFetch<EvalResponse>('/eval/run', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      setResult(data);
      return data;
    }
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { result, loading, error, runEval: mutate, reset };
}
