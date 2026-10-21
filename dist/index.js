#!/usr/bin/env node

// src/index.ts
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import * as p from "@clack/prompts";
import { downloadTemplate } from "giget";

// src/rename.ts
import { lstat, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
var SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".void"]);
var BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip)$/i;
var escapeRegExp = (value) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
var replacePlaceholder = async (root, placeholder, name) => {
  const pattern = new RegExp(escapeRegExp(placeholder), "g");
  let changed = 0;
  const walk = async (directory) => {
    for (const entry of await readdir(directory)) {
      if (SKIPPED_DIRECTORIES.has(entry)) {
        continue;
      }
      let path = join(directory, entry);
      const info = await lstat(path);
      if (info.isSymbolicLink()) {
        continue;
      }
      if (info.isDirectory()) {
        const renamed = join(directory, entry.replace(pattern, name));
        if (renamed !== path) {
          await rename(path, renamed);
          path = renamed;
        }
        await walk(path);
        continue;
      }
      if (!BINARY_EXTENSIONS.test(entry)) {
        const content = await readFile(path, "utf8");
        const next = content.replace(pattern, name);
        if (next !== content) {
          await writeFile(path, next);
          changed += 1;
        }
      }
      const renamed = join(directory, entry.replace(pattern, name));
      if (renamed !== path) {
        await rename(path, renamed);
      }
    }
  };
  await walk(root);
  return changed;
};

// src/templates.ts
var templates = [
  {
    id: "start",
    label: "TanStack Start + Void",
    hint: "oRPC, Better Auth, Effect, evlog, Ultracite",
    repo: "Sumisura-std/tanstemplate",
    placeholder: "tanstemplate"
  }
];

// src/index.ts
var NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
var { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    template: { type: "string", short: "t" },
    "no-install": { type: "boolean", default: false },
    "no-git": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false }
  }
});
if (values.help) {
  console.log(`Usage: create-app [name] [options]

Options:
  -t, --template <id>   Template to use (${templates.map((t) => t.id).join(", ")})
      --no-install      Skip installing dependencies
      --no-git          Skip git init
  -h, --help            Show this help`);
  process.exit(0);
}
var cancelAndExit = () => {
  p.cancel("Cancelled.");
  process.exit(1);
};
var unwrap = (value) => {
  if (p.isCancel(value)) {
    return cancelAndExit();
  }
  return value;
};
var validateName = (value) => value !== undefined && NAME_PATTERN.test(value) ? undefined : "Use lowercase letters, numbers, '-', '_' or '.', starting with a letter or number.";
var detectPackageManager = () => {
  const agent = process.env.npm_config_user_agent ?? "";
  const manager = agent.split("/")[0];
  return manager !== undefined && manager !== "" ? manager : "bun";
};
var run = (command, args, cwd) => spawnSync(command, args, { cwd, stdio: "ignore" }).status === 0;
var main = async () => {
  p.intro("create-app");
  const name = positionals[0] ?? unwrap(await p.text({
    message: "Project name",
    placeholder: "my-app",
    validate: validateName
  }));
  const nameError = validateName(name);
  if (nameError !== undefined) {
    p.cancel(nameError);
    process.exit(1);
  }
  const requested = values.template;
  let templateId = requested;
  if (templateId === undefined) {
    templateId = templates.length === 1 ? templates[0]?.id : unwrap(await p.select({
      message: "Template",
      options: templates.map((item) => ({
        value: item.id,
        label: item.label,
        hint: item.hint
      }))
    }));
  }
  const template = templates.find((item) => item.id === templateId);
  if (template === undefined) {
    p.cancel(`Unknown template "${templateId ?? ""}".`);
    process.exit(1);
  }
  const target = resolve(process.cwd(), name);
  if (existsSync(target) && readdirSync(target).length > 0) {
    p.cancel(`Directory "${name}" already exists and is not empty.`);
    process.exit(1);
  }
  const spinner2 = p.spinner();
  spinner2.start(`Downloading ${template.repo}`);
  await downloadTemplate(`gh:${template.repo}`, { dir: target, force: true });
  const changed = await replacePlaceholder(target, template.placeholder, name);
  spinner2.stop(`Created ${name} (${changed} files updated)`);
  if (!values["no-git"]) {
    const ok = run("git", ["init", "-b", "main"], target) && run("git", ["add", "-A"], target);
    p.log.info(ok ? "Initialized a git repository." : "Could not run git init.");
  }
  const manager = detectPackageManager();
  if (!values["no-install"]) {
    spinner2.start(`Installing dependencies with ${manager}`);
    const ok = run(manager, ["install"], target);
    spinner2.stop(ok ? "Dependencies installed." : `Install failed, run "${manager} install".`);
  }
  p.note([
    `cd ${name}`,
    "Create a .env with the keys declared in env.ts",
    `${manager} run dev`
  ].join(`
`), "Next steps");
  p.outro("Done.");
};
await main();
