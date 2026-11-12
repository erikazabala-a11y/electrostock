// Levanta backend (3000) y frontend (5173) a la vez. Ctrl+C cierra ambos.
import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const procesos = [
  spawn(npm, ["--prefix", "backend", "run", "dev"], { stdio: "inherit", shell: process.platform === "win32" }),
  spawn(npm, ["--prefix", "frontend", "run", "dev"], { stdio: "inherit", shell: process.platform === "win32" }),
];
const cerrar = () => procesos.forEach((p) => p.kill());
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
procesos.forEach((p) => p.on("exit", cerrar));
