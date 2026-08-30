# Repository instructions

These instructions apply to the entire repository.

## Workflow

1. Keep changes scoped to one documented outcome.
2. Use a branch and pull request after the initial repository foundation.
3. Add tests or explicit validation for behavior changes.
4. Update `[Unreleased]` in `CHANGELOG.md` for user-visible changes.
5. Preserve unrelated local work and never rewrite published history.

## Quality and safety

- Do not commit secrets, private documents, personal data, caches, dependencies, or build output.
- Do not invent test, review, benchmark, or release evidence.
- Treat document content and AI output as untrusted input.
- Keep browser, API, collaboration, and version semantics aligned.
- Automated tools are not Git authors or co-authors. The human contributor owns and reviews each
  submitted change.

## Product language

Use the lowercase product name `doc`. Consume the organization-owned semantic tokens and shared
components from `@fullstack-ai-infra/ui`; do not recreate brand primitives or introduce raw product
colors. The approved C direction is warm paper canvas, stone navigation, sage primary actions, and
lavender reserved for AI affordances. Light and dark themes are equally supported, and product copy
must remain explicit about current capability versus roadmap.
