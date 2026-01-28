import { readFile, writeFile } from "node:fs/promises";

const uiPackagePath = new URL("../ui/package.json", import.meta.url);
const metadataPath = new URL("../metadata.json", import.meta.url);

const uiPackage = JSON.parse(await readFile(uiPackagePath, "utf8"));
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));

if (metadata.version !== uiPackage.version) {
  metadata.version = uiPackage.version;
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}
