# A visual style workspace

The category is the scope. The preview is the object. Conversation is a way to change it, not another settings section.

## Four directions considered

| Direction | Useful property | Main cost |
| --- | --- | --- |
| Chat above presets | Immediate freedom | Competing forms, long scrolling, unclear result |
| Global style assistant | One entry point | Ambiguous category and change scope |
| Guided wizard | Clear sequence | Too restrictive for exploratory work |
| Gallery + focused maker | Recognition first, freedom on demand | One explicit mode switch |

The gallery + maker keeps **Choose a look** and **Make your own** in the category. The first shows presets and deterministic controls. The second shows a visual study, a plain-language prompt, and one action. No CSS editor is required or exposed. Previously saved backgrounds still render and their code is passed internally as context for refinement.

After generation, the composer asks what to change. The most recent response sits beside the preview; older conversation stays collapsed. Undo last refinement rolls back the latest local step; Apply commits the draft, while Reset or closing discards uncommitted changes. Leaving the maker cancels a pending request without losing its unsent instruction. AI connection never submits the prompt.

Data and graphics studies configure future generations, not existing artifacts. Fictional preview data is labeled. Background/color previews also update the page while drafting. Browsing choices never invokes a model.

## Iterations and checks

1. Replaced the chat-plus-settings stack with two mutually exclusive workspaces.
2. Inspected narrow and wide layouts; shortened the refinement invitation, gave the composer a quiet input surface, and added one-step undo.
3. Offline browser checks cover keyboard selection, preview/refine/undo, Apply/reload, Reset/close, error/cancel, late responses, private key handling and sandbox isolation. Grid regression checks protect rail/orb alignment and centering.

These are implementation checks and a design review, not a claim of user-study validation. Live model output quality remains a separate evaluation with a visitor's key.
