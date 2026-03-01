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
│  catalog / schema   │  ─ Chat/Raw toggle in header         │
│                     │  ─ Edit mode: system + user textareas│
│  Experiment select  │  ─ Preview mode: rendered panels     │
│  + filter checkbox  │                                       │
│                     │  ResponsePanel  (flex-1, ~40%)        │
│  PromptSelector     │  ─ Response text                     │
│  ─ prompt dropdown  │  ─ Score / rationale (if scored)     │
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
- Chat view: indigo System panel + gray User panel when system present; plain text otherwise
- Raw view: full XML string (HTML-escaped so `<system>` renders as literal text, not invisible HTML)
- Auto-switches to Chat when system prompt detected, Raw when absent
- Chat button disabled when no system prompt (`opacity-40 cursor-not-allowed`)

**Edit mode** (New Version):
- Chat view: System textarea (indigo, optional, `rows=3`) + User textarea (gray, `flex-1`)
- Raw view: single textarea with full XML content
- Local `localSystem` / `localUser` state; changes rebuild XML via `buildXmlTemplate` → call `onDraftChange`
- Toggle syncs: Chat→Raw (draft already up-to-date); Raw→Chat (re-parse draft)
- On edit entry: parse draft → init `localSystem` / `localUser`, reset to Chat mode
- "Register Version" button disabled when `!isDirty`

### JudgeForm.tsx — Create/Edit Judge (slide-over)
- Two judge types: **Custom** (free-form instructions textarea) and **Guidelines** (list of rule inputs)
- Name validation: `^[a-z][a-z0-9_]*$` — red border + inline error on invalid
- Edit mode: name field read-only; success banner stays visible after save (form stays open)
- Create mode: form closes after save, new judge auto-selected

### EvaluatePanel.tsx — Inline Subcomponents
- `TemplatePreview`: collapsible; shows indigo System + gray User panels when system prompt present
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
- **System prompt**: indigo (`bg-indigo-50 border-indigo-100`) panels
- **User prompt**: gray (`bg-gray-50 border-gray-200`) panels
- **Template variables**: purple highlight (`bg-purple-100 text-purple-700`)
- **Guideline numbers**: purple circle badges (`bg-purple-100 text-purple-700 rounded-full`)
- **Success states**: green (`bg-green-50 border-green-200 text-green-700`)
- **Error states**: red (`bg-red-50 border-red-200 text-red-700`)
- **Font**: monospace (`font-mono`) for prompt content
