# @sumisura/create-app

Scaffold a new project from a Sumisura template.

```sh
# Until it is published to npm
bunx github:Sumisura-std/create-app#main my-app

# After publishing
bun create @sumisura/app my-app
```

Options: `-t, --template <id>`, `--no-install`, `--no-git`.

Create a project from the Minimal Astro template:

```sh
bunx github:Sumisura-std/create-app#main my-site --template astro
```

## Adding a template

1. Add an entry to `src/templates.ts` (`id`, `repo` and the `placeholder` text to replace with the project name).
2. For a private repo, sign in with `gh auth login` or set `GIGET_AUTH`, `GH_TOKEN` or `GITHUB_TOKEN` to a token that can read it. The CLI reads a token from `gh` when available.
3. Run `bun run build`, commit `dist/` and publish.

`dist/` is committed so the CLI can run straight from GitHub.
