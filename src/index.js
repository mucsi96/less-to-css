const { readdir } = require("fs/promises");
const { resolve } = require("path");

async function listFilesInFolder(path, options = {}) {
  const dirEntries = await readdir(path, { withFileTypes: true });
  const { ignore = [], patterns = [] } = options;

  const files = await Promise.all(
    dirEntries.map((dirEntry) => {
      if (ignore.includes(dirEntry.name)) {
        return undefined;
      }

      if (dirEntry.isDirectory()) {
        return listFilesInFolder(resolve(path, dirEntry.name), options);
      }

      const filePath = resolve(path, dirEntry.name);

      if (patterns.some((pattern) => pattern.test(filePath))) {
        return filePath;
      }
    })
  );

  return files.flatMap((file) => file).filter(Boolean);
}

listFilesInFolder(resolve(__dirname, ".."), {
  ignore: [".git"],
  patterns: [/.less$/],
})
  .then(console.log)
  .catch(console.error);
