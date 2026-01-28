import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const imageName = process.argv[2] ?? "dive-in:ci";
const metadataPath = process.argv[3] ?? "metadata.json";

const requiredLabels = [
  "org.opencontainers.image.title",
  "org.opencontainers.image.description",
  "org.opencontainers.image.vendor",
  "com.docker.desktop.extension.api.version",
  "com.docker.extension.screenshots",
  "com.docker.extension.detailed-description",
  "com.docker.desktop.extension.icon",
  "com.docker.extension.publisher-url",
  "com.docker.extension.categories",
  "com.docker.extension.additional-urls",
  "com.docker.extension.changelog",
];

const validateMetadata = async () => {
  const raw = await readFile(metadataPath, "utf8");
  const data = JSON.parse(raw);

  if (!data?.ui?.["dashboard-tab"]?.src) {
    throw new Error("metadata.json: ui.dashboard-tab.src is required");
  }
  if (!data?.ui?.["dashboard-tab"]?.root) {
    throw new Error("metadata.json: ui.dashboard-tab.root is required");
  }
  if (!data?.vm?.composefile && !data?.vm?.image) {
    throw new Error("metadata.json: vm.composefile or vm.image is required");
  }
};

const validateImageLabels = async () => {
  const { stdout } = await execFileAsync("docker", [
    "image",
    "inspect",
    imageName,
    "--format",
    "{{json .Config.Labels}}",
  ]);
  const labels = JSON.parse(stdout.trim());
  const missing = requiredLabels.filter((label) => !labels?.[label]);
  if (missing.length > 0) {
    throw new Error(`Missing required labels: ${missing.join(", ")}`);
  }
};

try {
  await validateMetadata();
  await validateImageLabels();
  console.log("Extension validation passed.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
