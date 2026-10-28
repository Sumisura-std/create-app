# @sumisura/create-app

Scaffold a new project from a Sumisura template.

```sh
# Until it is published to npm
bunx github:Sumisura-std/create-app my-app

# After publishing
bun create @sumisura/app my-app
```

Options: `-t, --template <id>`, `--no-install`, `--no-git`.

Create a project from the Minimal Astro template:

```sh
bunx github:Sumisura-std/create-app my-site --template astro
```

## Adding a template

1. Make the repo public and mark it as a template repository.
2. Add an entry to `src/templates.ts` (`id`, `repo` and the `placeholder` text to replace with the project name).
3. `bun run build`, commit `dist/` and publish.

`dist/` is committed so the CLI can run straight from GitHub.
