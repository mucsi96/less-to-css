const { readdir, readFile, writeFile } = require("fs/promises");
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

async function replaceInFile(path, items) {
  const source = await readFile(path, "utf8");
  console.log(items);
  const replacedSource = items.reduce(
    (acc, item) => acc.replaceAll(item[0], item[1]),
    source
  );
  await writeFile(`${path}.new`, replacedSource, "utf8");
}

async function listLessVariables(path, options) {
  const lessFiles = await listFilesInFolder(path, options);

  const lessVariables = await Promise.all(lessFiles.map(listVariablesInFile));

  return [...new Set(lessVariables.flatMap((item) => item))];
}

async function mapLessVariables(path, variableMap, options) {
  const lessFiles = await listFilesInFolder(path, options);
  const lessVariables = await listLessVariables(path, options);
  const unmappedVariable = lessVariables.find(
    (variable) => !variableMap[variable]
  );

  if (unmappedVariable) {
    throw new Error(`Variable "@${unmappedVariable}" missing in map.`);
  }

  const itemToReplace = Object.entries(variableMap).map(([from, to]) => [
    new RegExp(`@${from};`, "g"),
    `var(${to});`,
  ]);
  await Promise.all(
    lessFiles.map((path) => replaceInFile(path, itemToReplace))
  );
}

async function main() {
  const path = resolve(__dirname, "..");
  const options = {
    ignore: [".git"],
    patterns: [/.less$/],
  };
  const lessVariables = await listLessVariables(path, options);
  console.log(lessVariables);

  await mapLessVariables(
    path,
    {
      green: "--color-green",
      blue: "--color-blue",
      text: "--color-text"
    },
    options
  );
}

main().catch(console.error);
