# UI Design

## Layout Overview

Two-tab app: **Playground** and **Evaluate**. The Evaluate tab is always mounted (hidden with `hidden` CSS class) so state is preserved across tab switches.

---

## Playground Tab

```
┌─────────────────────┬──────────────────────────────────────┐
│  Left panel (w-80)  │  Right panel (flex-1)                │
│                     │                                       │
│  Prompt Registry    │  PromptPreview  (h-3/5, fixed)       │
│  catalog / schema   │  ─ Preview mode: rendered template   │
│                     │  ─ Edit mode: single textarea        │
│  Experiment select  │                                       │
│  + filter checkbox  │  ResponsePanel  (flex-1, ~40%)       │
│                     │  ─ Response text                     │
│  PromptSelector     │  ─ Score / rationale (if scored)     │
│  ─ prompt dropdown  │                                       │
│  ─ version list     │                                       │
│                     │                                       │
│  VariableInputs     │                                       │
│                     │                                       │
│  ModelSelector      │                                       │
│  RunControls        │                                       │
└─────────────────────┴──────────────────────────────────────┘
```

---

## Evaluate Tab

```
┌─────────────────────┬──────────────────────────────────────┐
│  Left config (w-80) │  Right results (flex-1)              │
│                     │                                       │
│  Eval Dataset       │  EvalResults table                   │
│  catalog . schema   │  ─ avg score badge                   │
│  table select       │  ─ per-row: prompt/response/score    │
│                     │  ─ GuidelineChecklist if score_details│
│  Experiment select  │                                       │
│  + filter checkbox  │                                       │
│                     │                                       │
│  Prompt select      │                                       │
│  Version select     │                                       │
│  PromptPreview ▼    │                                       │
│                     │                                       │
│  Judge select       │                                       │
│  ─ [New] [Edit] [🗑]│                                       │
│  JudgePreview ▼     │                                       │
│  Judge model/temp   │                                       │
│  (only if no judge) │                                       │
│                     │                                       │
│  Model select       │                                       │
│  Column mapping     │                                       │
│  Max rows slider    │                                       │
│  [Run Evaluation]   │                                       │
└─────────────────────┴──────────────────────────────────────┘
```

---

## Component Responsibilities

### App.tsx — Root State
Holds all "shared" state lifted to the top:
- `activeCatalog` / `activeSchema` — Playground prompt registry location
- `selectedPrompt` / `selectedVersion`
- `selectedModel`
- `experimentName` / `filterByExperiment`
- `template` (PromptTemplate | null) — loaded by usePromptTemplate
- `versions` — loaded by useVersions

**Evaluate tab** uses its own local `localEvalCatalog` / `localEvalSchema` (independent from Playground catalog/schema).

### PromptPreview.tsx — Edit + Preview
Two modes controlled by `usePromptEditor`:

**Preview mode** (default):
- Renders the template string with variable values substituted in-place
- Unfilled `{{variables}}` show as-is in the rendered output
- "New Version" button only shown when `isLatestVersion` is true

**Edit mode** (triggered by "New Version" button):
- Single textarea containing the full template string
- Variable extraction debounced 300ms as user types (`parseTemplateVariables`)
- Save opens a dialog prompting for a version description
- "Register Version" button disabled when `!isDirty`

### JudgeForm.tsx — Create/Edit Judge (slide-over)
- Two judge types: **Custom** (free-form instructions textarea) and **Guidelines** (list of rule inputs)
- Name validation: any non-empty string accepted (Pydantic `min_length=1` only; no frontend regex)
- "Add variable" button inserts `{{ trace }}` or `{{ expectations }}` into the instructions field
- Edit mode: name field read-only; success banner stays visible after save (form stays open)
- Create mode: form closes after save, new judge auto-selected

### EvaluatePanel.tsx — Inline Subcomponents
- `TemplatePreview`: collapsible; strips `<system>`/`<user>` XML tags and normalizes `\n` escapes by default; "Raw" toggle (shown only when template has XML tags) reveals full template with tags
- `JudgePreview`: collapsible; lazy-loads detail on expand; renders numbered circle list for guidelines type, plain text for custom type

### SearchableSelect.tsx
Supports `groups` prop for grouped options (used in Judge picker: "Built-in Presets" + "Registered Judges").

---

## State Management Patterns

### Stale State Fixes
- Version list clears immediately on `selectedPrompt` change (`usePromptApi.ts`: `setVersions([])` fires before fetch)
- Experiment filter count clears immediately on `experimentName` change (`useEvalApi.ts`: `setPromptNames(null)` fires before fetch)

### Auto-select Latest Version
Both Playground (`PromptSelector` useEffect) and Evaluate (`EvaluatePanel` useEffect) auto-select `versions[0].version` when versions load and `selectedVersion` is null.

### isLatestVersion
Computed in App.tsx:
```ts
const isLatestVersion = !versions.length || !selectedVersion || selectedVersion === versions[0]?.version;
```
"New Version" button in PromptPreview only shown when `isLatestVersion` is true (or already in edit mode).

### usePromptEditor State
```ts
activeTemplate = isEditing ? draftTemplate : (template?.template || null)
isDirty = isEditing && draftTemplate !== (template?.template || '')
```

---

## Overlay / Z-index Layer

| Layer | z-index | Component |
|-------|---------|-----------|
| Backdrop | 40 | JudgeForm, PromptForm, ConfirmDialog backdrops |
| Panel | 50 | JudgeForm, PromptForm slide-overs; ConfirmDialog modal |

Slide-overs: `fixed inset-y-0 right-0 z-50 w-full max-w-lg`
ConfirmDialog: `fixed inset-0 z-50 flex items-center justify-center`

---

## Visual Design Conventions

- **Brand color**: `databricks-red` (`#FF3621`) — buttons, focus rings, accents
- **Template variables**: purple highlight (`bg-purple-100 text-purple-700`)
- **Guideline numbers**: purple circle badges (`bg-purple-100 text-purple-700 rounded-full`)
- **Success states**: green (`bg-green-50 border-green-200 text-green-700`)
- **Error states**: red (`bg-red-50 border-red-200 text-red-700`)
- **Font**: monospace (`font-mono`) for prompt content
