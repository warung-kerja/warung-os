# Warung OS — Low Fidelity Static HTML Wireframe

## Design stance
A dark, layout-first operating shell that preserves the Mission Control Online discipline while making Home feel like a readable daily brief instead of a pure analytics dashboard.

## Included screens
- Home / Daily Brief
- Active Projects
- Operations
- Wiki

All screens live in one static `index.html` with sidebar tab switching.

## Key choices
- **Navigation:** Four top-level pages exactly matching the UX brief.
- **Home emphasis:** Human morning brief first; metrics support the narrative.
- **Projects:** Simple masterlist first, with a placeholder project-specific approval module.
- **Operations:** Technical health stays available but secondary.
- **Wiki:** Search/browse first; AI search deferred to Phase 2.
- **Visual fidelity:** Low-to-mid fidelity grayscale/dark shell with one orange signal color; no polished brand pass yet.

## Trade-offs
- Strong at: testing product structure, information hierarchy, page roles, and approval placement.
- Weak at: final visual design, responsive details, data realism, and actual source integration.

## Open locally
```bash
open /Users/gabi/Documents/warung-repo/warung-os/wireframes/001-low-fi-warung-os/index.html
```

## Next decisions for Raz
1. Does the four-page navigation feel right?
2. Should Home be the first MVP surface?
3. Is Active Projects okay as a simple status list in Phase 1?
4. Should project-specific approval modules wait for Phase 2?
