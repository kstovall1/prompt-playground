import { useState, useCallback } from 'react';
import type { PromptTemplate } from '../types';

interface UsePromptEditorArgs {
  template: PromptTemplate | null;
  selectedPrompt: string | null;
  activeCatalog: string;
  activeSchema: string;
  createPrompt: (params: { name: string; template: string; description: string }) => Promise<{ name: string; version: string }>;
  saveVersion: (params: { name: string; template: string; description: string }) => Promise<{ name: string; version: string }>;
  refreshPrompts: () => Promise<void>;
  refreshVersions: () => Promise<void>;
  setSelectedPrompt: (name: string | null) => void;
  setSelectedVersion: (version: string | null) => void;
  setVariableValues: (values: Record<string, string>) => void;
}

export function usePromptEditor({
  template,
  selectedPrompt,
  activeCatalog,
  activeSchema,
  createPrompt,
  saveVersion,
  refreshPrompts,
  refreshVersions,
  setSelectedPrompt,
  setSelectedVersion,
  setVariableValues,
}: UsePromptEditorArgs) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTemplate, setDraftTemplate] = useState('');
  const [draftVariables, setDraftVariables] = useState<string[]>([]);
  const [isNewPrompt, setIsNewPrompt] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');

  // Derived values — compare against raw_template so edits to a prompt with a system prompt
  // don't show as dirty before the user has changed anything
  const baseTemplate = template?.raw_template ?? template?.template ?? '';
  const isDirty = isEditing && draftTemplate !== baseTemplate;
  const activeVariables = isEditing ? draftVariables : (template?.variables || []);
  const activeTemplate = isEditing ? draftTemplate : (template?.raw_template ?? template?.template ?? null);

  const toggleEdit = useCallback(() => {
    if (!isEditing && template) {
      // Initialize from raw_template so the system prompt XML is preserved in the editor
      setDraftTemplate(template.raw_template ?? template.template);
      setDraftVariables(template.variables);
    }
    setIsEditing((prev) => !prev);
  }, [isEditing, template]);

  const createNew = useCallback(() => {
    setIsNewPrompt(true);
    setIsEditing(true);
    setDraftTemplate('');
    setDraftVariables([]);
    setNewPromptName('');
    setSelectedPrompt(null);
    setSelectedVersion(null);
    setVariableValues({});
  }, [setSelectedPrompt, setSelectedVersion, setVariableValues]);

  const save = useCallback(
    async (description: string) => {
      try {
        if (isNewPrompt) {
          const fullName = `${activeCatalog}.${activeSchema}.${newPromptName}`;
          const result = await createPrompt({
            name: fullName,
            template: draftTemplate,
            description,
          });
          await refreshPrompts();
          setSelectedPrompt(result.name);
          setSelectedVersion(result.version);
          setIsNewPrompt(false);
        } else if (selectedPrompt) {
          const result = await saveVersion({
            name: selectedPrompt,
            template: draftTemplate,
            description,
          });
          await refreshVersions();
          setSelectedVersion(result.version);
        }
        setIsEditing(false);
        setVariableValues({});
      } catch {
        // Errors captured in hooks, displayed in UI
      }
    },
    [
      isNewPrompt, newPromptName, activeCatalog, activeSchema, selectedPrompt,
      draftTemplate, createPrompt, saveVersion, refreshPrompts, refreshVersions,
      setSelectedPrompt, setSelectedVersion, setVariableValues,
    ]
  );

  const exitEdit = useCallback(() => {
    setIsEditing(false);
    setIsNewPrompt(false);
  }, []);

  return {
    isEditing,
    draftTemplate,
    draftVariables,
    isNewPrompt,
    newPromptName,
    isDirty,
    activeVariables,
    activeTemplate,
    setDraftTemplate,
    setDraftVariables,
    setNewPromptName,
    toggleEdit,
    createNew,
    save,
    exitEdit,
  };
}
