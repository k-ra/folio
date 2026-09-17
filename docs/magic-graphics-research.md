# Magic graphics

Proposed runtime work, not installed dependencies.

- [D3](https://d3js.org/) for bespoke SVG/Canvas diagrams, scales, geometry and transitions.
- [Observable Plot](https://observablehq.com/plot/) for sound first drafts from real data, including uncertainty and pointer interaction.
- [Three.js](https://threejs.org/examples/) for intentionally spatial worlds and particles, with pause, cleanup and non-WebGL fallback.

Use a few excellent recipes rather than loading every library. Inherit the story's type, ink and paper. Keep exact data, units, gaps and uncertainty; never invent values for a prettier composition. Recompose for mobile and full bleed, support keyboard/touch inspection, and make motion explain a change.

Today's generated artifacts use native HTML/SVG in a network-isolated iframe. Library support needs pinned trusted runtime packs, a versioned artifact contract and explicit mount/update/dispose behavior. Do not loosen sandbox access to storage, credentials or the parent document just to load a CDN.

Study [Lieflat Charts](https://github.com/larashero3-dotcom/lieflat-charts) for its data-to-recipe approach, and [Figures in the Sky](https://www.visualcinnamon.com/portfolio/figures-in-the-stars/) for continuity between prose and graphics. Lieflat declares a noncommercial license; its code/templates are not vendored here. References are inspiration, not automatically licensed implementation material.

Image presets are implemented separately: four original generated WebPs, short editable directions and an explicit style-reference image input on generation. [Prompts and provenance](../src/assets/image-studies/provenance.json) accompany the assets. No third-party reference pixels or copied prompts are bundled. Style references supply texture and mark-making, not a mandatory subject, layout or lettering.
