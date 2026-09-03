#!/usr/bin/env node
/**
 * Produce a Windows NSIS installer (Tibaa_x.y.z_x64-setup.exe).
 *
 * Requires: Node 20, Rust + MSVC, .NET 8 SDK.
 * Output: apps/shop-desktop-app/src-tauri/target/release/bundle/nsis/
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcTauri = join(root, "apps", "shop-desktop-app", "src-tauri");
const binariesDir = join(srcTauri, "binaries");
const bundledWorker = join(binariesDir, "print-worker.exe");
const workerProject = join(root, "apps", "print-worker", "PrintWorker.csproj");

function resolveDotnet() {
  if (process.env.DOTNET_ROOT) {
    const p = join(process.env.DOTNET_ROOT, "dotnet.exe");
    if (existsSync(p)) return p;
  }
  const candidates = [
    join(process.env.ProgramFiles || "C:\\Program Files", "dotnet", "dotnet.exe"),
    join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "dotnet", "dotnet.exe"),
    join(process.env.LOCALAPPDATA || "", "Microsoft", "dotnet", "dotnet.exe"),
  ];
  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return "dotnet";
}

function findVsDevCmd() {
  const roots = [
    process.env["ProgramFiles(x86)"],
    process.env.ProgramFiles,
  ].filter(Boolean);
  const editions = ["BuildTools", "Community", "Professional", "Enterprise"];
  for (const root of roots) {
    for (const ed of editions) {
      const p = join(
        root,
        "Microsoft Visual Studio",
        "2022",
        ed,
        "Common7",
        "Tools",
        "VsDevCmd.bat",
      );
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function quoteWin(value) {
  const s = String(value);
  if (!/\s/.test(s)) return s;
  return `"${s.replace(/"/g, '\\"')}"`;
}

function run(cmd, args, opts = {}) {
  const env = { ...process.env, ...(opts.env ?? {}) };
  const dotnetDir = dirname(resolveDotnet());
  if (dotnetDir && existsSync(join(dotnetDir, "dotnet.exe"))) {
    env.Path = `${dotnetDir};${env.Path || env.PATH || ""}`;
    env.PATH = env.Path;
  }
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: opts.shell ?? false,
    cwd: opts.cwd ?? root,
    env,
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runInMsvc(cmd, args) {
  const vs = findVsDevCmd();
  if (!vs) {
    run(cmd, args, { shell: true });
    return;
  }
  const quoted = [cmd, ...args].map(quoteWin).join(" ");
  const line = `call "${vs}" -arch=amd64 -host_arch=amd64 && ${quoted}`;
  const env = { ...process.env };
  const dotnetDir = dirname(resolveDotnet());
  if (dotnetDir && existsSync(join(dotnetDir, "dotnet.exe"))) {
    env.Path = `${dotnetDir};${env.Path || env.PATH || ""}`;
    env.PATH = env.Path;
  }
  const r = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", line], {
    stdio: "inherit",
    cwd: root,
    env,
    windowsVerbatimArguments: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const dotnet = resolveDotnet();

console.log("Publishing self-contained print-worker (win-x64)…");
mkdirSync(binariesDir, { recursive: true });
run(dotnet, [
  "publish",
  workerProject,
  "-c",
  "Release",
  "-r",
  "win-x64",
  "--self-contained",
  "true",
  "-p:PublishSingleFile=true",
  "-p:IncludeNativeLibrariesForSelfExtract=true",
  "-p:EnableCompressionInSingleFile=true",
  "-p:DebugType=none",
  "-p:DebugSymbols=false",
  "-o",
  binariesDir,
]);

if (!existsSync(bundledWorker)) {
  console.error("print-worker.exe was not produced at", bundledWorker);
  process.exit(1);
}

const pdb = join(binariesDir, "print-worker.pdb");
if (existsSync(pdb)) {
  try {
    unlinkSync(pdb);
  } catch {
    /* ignore */
  }
}

const updaterKey =
  process.env.TAURI_SIGNING_PRIVATE_KEY ||
  process.env.TAURI_SIGNING_PRIVATE_KEY_PATH;
const extraArgs = [];
if (updaterKey) {
  extraArgs.push(
    "--config",
    JSON.stringify({ bundle: { createUpdaterArtifacts: true } }),
  );
}

console.log("Building Windows NSIS installer…");
runInMsvc("npm", [
  "run",
  "tauri",
  "--workspace=@omsp/shop-desktop-app",
  "--",
  "build",
  "--bundles",
  "nsis",
  ...extraArgs,
]);

const nsisDir = join(srcTauri, "target", "release", "bundle", "nsis");
console.log("\nInstaller folder:");
console.log(nsisDir);
if (existsSync(nsisDir)) {
  run("cmd", ["/c", "dir", "/b", nsisDir]);
}
