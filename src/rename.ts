import { lstat, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".void"]);
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf|zip)$/i;

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Replaces `placeholder` with `name` in the contents and in the names of every
 * file below `root`. Returns the number of files whose contents changed.
 */
export const replacePlaceholder = async (
  root: string,
  placeholder: string,
  name: string,
): Promise<number> => {
  const pattern = new RegExp(escapeRegExp(placeholder), "g");
  let changed = 0;

  const walk = async (directory: string): Promise<void> => {
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
