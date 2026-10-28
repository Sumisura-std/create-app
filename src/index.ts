#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import * as p from "@clack/prompts";
import { downloadTemplate } from "giget";

import { replacePlaceholder } from "./rename";
import { templates } from "./templates";

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    template: { type: "string", short: "t" },
    "no-install": { type: "boolean", default: false },
    "no-git": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
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

const cancelAndExit = (): never => {
  p.cancel("Cancelled.");
  process.exit(1);
};

const unwrap = <T>(value: T | symbol): T => {
  if (p.isCancel(value)) {
    return cancelAndExit();
  }

  return value as T;
};

const validateName = (value: string | undefined): string | undefined =>
  value !== undefined && NAME_PATTERN.test(value)
    ? undefined
    : "Use lowercase letters, numbers, '-', '_' or '.', starting with a letter or number.";

const detectPackageManager = (): string => {
  const agent = process.env.npm_config_user_agent ?? "";
  const manager = agent.split("/")[0];

  return manager !== undefined && manager !== "" ? manager : "bun";
};

const run = (command: string, args: string[], cwd: string): boolean =>
  spawnSync(command, args, { cwd, stdio: "ignore" }).status === 0;

const getGitHubToken = (): string | undefined => {
  const token =
    process.env.GIGET_AUTH ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (token !== undefined && token !== "") {
    return token;
  }

  const result = spawnSync("gh", ["auth", "token"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? result.stdout.trim() || undefined : undefined;
};

const main = async (): Promise<void> => {
  p.intro("create-app");

  const name = positionals[0] ?? unwrap(
    await p.text({
      message: "Project name",
      placeholder: "my-app",
      validate: validateName,
    }),
  );
  const nameError = validateName(name);
  if (nameError !== undefined) {
    p.cancel(nameError);
    process.exit(1);
  }

  const requested = values.template;
  let templateId = requested;
  if (templateId === undefined) {
    templateId =
      templates.length === 1
        ? templates[0]?.id
        : unwrap(
            await p.select({
              message: "Template",
              options: templates.map((item) => ({
                value: item.id,
                label: item.label,
                hint: item.hint,
              })),
            }),
          );
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

  const spinner = p.spinner();

  spinner.start(`Downloading ${template.repo}`);
  await downloadTemplate(`gh:${template.repo}`, {
    dir: target,
    force: true,
    auth: getGitHubToken(),
  });
  const changed = await replacePlaceholder(target, template.placeholder, name);
  spinner.stop(`Created ${name} (${changed} files updated)`);

  if (!values["no-git"]) {
    const ok =
      run("git", ["init", "-b", "main"], target) &&
      run("git", ["add", "-A"], target);
    p.log.info(ok ? "Initialized a git repository." : "Could not run git init.");
  }

  const manager = detectPackageManager();
  if (!values["no-install"]) {
    spinner.start(`Installing dependencies with ${manager}`);
    const ok = run(manager, ["install"], target);
    spinner.stop(
      ok ? "Dependencies installed." : `Install failed, run "${manager} install".`,
    );
  }

  p.note(
    [
      `cd ${name}`,
      ...(template.setupNote === undefined ? [] : [template.setupNote]),
      `${manager} run dev`,
    ].join("\n"),
    "Next steps",
  );
  p.outro("Done.");
};

await main();
