const { readdir, readFile } = require("fs/promises");
const { resolve } = require("path");

async function listFilesInFolder(path, options = {}) {
  const dirEntries = await readdir(path, { withFileTypes: true });
  const { ignore = [], patterns = [] } = options;

  const files = await Promise.all(
    dirEntries.map((dirEntry) => {
      const filePath = resolve(path, dirEntry.name);

      if (ignore.includes(dirEntry.name)) {
        return undefined;
      }

      if (dirEntry.isDirectory()) {
        return listFilesInFolder(filePath, options);
      }

      if (patterns.some((pattern) => pattern.test(filePath))) {
        return filePath;
      }
    })
  );

  return files.flatMap((file) => file).filter(Boolean);
}

async function listVariablesInFile(path) {
  const source = await readFile(path, "utf8");
  return [...source.matchAll(/@(\w+);/g)].map((match) => match[1]);
}

async function listLessVariables(path) {
  const lessFiles = await listFilesInFolder(path, {
    ignore: [".git"],
    patterns: [/.less$/],
  });

  const lessVariables = await Promise.all(lessFiles.map(listVariablesInFile));

  return [...new Set(lessVariables.flatMap((item) => item))];
}

async function main() {
  const lessVariables = await listLessVariables(resolve(__dirname, ".."));
  console.log(lessVariables);
}

main().catch(console.error);
