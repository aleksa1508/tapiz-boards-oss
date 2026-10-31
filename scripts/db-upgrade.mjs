import { spawn } from "node:child_process";

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", scriptName], {
      shell: process.platform === "win32",
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}

async function main() {
  const schemaResult = await runNpmScript("db:push");
  const pushReportedSuccess =
    schemaResult.code === 0 &&
    /Changes applied|No changes detected/.test(schemaResult.output) &&
    !/^\s*Error:/m.test(schemaResult.output) &&
    !schemaResult.output.includes("All changes were aborted");

  if (!pushReportedSuccess) {
    throw new Error(
      "Database schema update did not complete successfully. Author snapshot backfill was not run.",
    );
  }

  const backfillResult = await runNpmScript("db:backfill-import-snapshots");
  if (backfillResult.code !== 0) {
    throw new Error("Author snapshot backfill failed.");
  }
}

main().catch((error) => {
  console.error("Database upgrade failed:", error);
  process.exitCode = 1;
});
