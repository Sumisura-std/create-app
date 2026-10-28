export interface Template {
  /** Short id used with `--template`. */
  id: string;
  label: string;
  hint: string;
  /** GitHub `owner/repo`, optionally followed by `#branch`. */
  repo: string;
  /** Text replaced by the project name in every file of the template. */
  placeholder: string;
  /** Optional setup guidance shown after the project is created. */
  setupNote?: string;
}

/** Add a new template here and publish a new version of the CLI. */
export const templates: readonly Template[] = [
  {
    id: "start",
    label: "TanStack Start + Void",
    hint: "oRPC, Better Auth, Effect, evlog, Ultracite",
    repo: "Sumisura-std/tanstemplate",
    placeholder: "tanstemplate",
    setupNote: "Create a .env with the keys declared in env.ts",
  },
  {
    id: "astro",
    label: "Minimal Astro",
    hint: "Astro starter",
    repo: "Sumisura-std/minimal-astro",
    placeholder: "minimal-astro",
  },
];
