#!/usr/bin/env node
/**
 * Builds print-worker (if needed) then runs `tauri dev`.
 * On Windows, prefer a shell where MSVC `link.exe` is on PATH
 * (VS Build Tools Developer PowerShell), or install Build Tools with C++.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workerExe = join(
  root,
  "apps",
  "print-worker",
  "bin",
  "Release",
  "net8.0-windows",
  "print-worker.exe",
);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    cwd: opts.cwd ?? root,
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(workerExe)) {
  console.log("Building print-worker...");
  const dotnet = process.env.DOTNET_ROOT
    ? join(process.env.DOTNET_ROOT, "dotnet")
    : "dotnet";
  run(dotnet, [
    "build",
    "apps/print-worker/PrintWorker.csproj",
    "-c",
    "Release",
  ]);
}

run("npm", ["run", "tauri:dev", "--workspace=@omsp/shop-desktop-app"]);
