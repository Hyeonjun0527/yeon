import { spawn } from "node:child_process";
import readline from "node:readline";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const services = [
  {
    name: "web",
    color: "\x1b[35m",
    args: ["--filter", "@yeon/web", "dev"],
  },
  {
    name: "mobile",
    color: "\x1b[36m",
    interactive: true,
    args: ["--filter", "@yeon/mobile", "dev"],
  },
  {
    name: "race-server",
    color: "\x1b[32m",
    args: ["--filter", "@yeon/race-server", "dev"],
  },
];

const reset = "\x1b[0m";
const children = new Map();
let shuttingDown = false;
let sawFailure = false;

function logLine(service, message, stream = "stdout") {
  const streamTag = stream === "stderr" ? "!" : ">";
  process.stdout.write(
    `${service.color}[${service.name}:${streamTag}]${reset} ${message}\n`,
  );
}

function attachLines(service, stream, streamName) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    logLine(service, line, streamName);

    if (
      line.includes("Another next dev server is already running.") ||
      line.includes("Port 3000 is in use by an unknown process")
    ) {
      service.nonFatalExit = true;
    }
  });
}

function maybeExit() {
  if (children.size > 0) {
    return;
  }

  process.exit(sawFailure ? 1 : 0);
}

function stopChildren(signal = "SIGINT") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children.values()) {
    child.kill(signal);
  }

  setTimeout(() => {
    for (const child of children.values()) {
      child.kill("SIGKILL");
    }
  }, 2_000).unref();
}

for (const service of services) {
  const child = spawn(command, service.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: service.interactive ? "inherit" : ["inherit", "pipe", "pipe"],
  });

  children.set(service.name, child);
  if (!service.interactive) {
    attachLines(service, child.stdout, "stdout");
    attachLines(service, child.stderr, "stderr");
  }

  child.on("exit", (code, signal) => {
    children.delete(service.name);

    if (shuttingDown) {
      maybeExit();
      return;
    }

    const exitReason = signal
      ? `signal ${signal}`
      : `code ${code === null ? "null" : code}`;

    if (code && !service.nonFatalExit) {
      sawFailure = true;
      logLine(service, `프로세스가 ${exitReason}로 종료되었습니다.`, "stderr");
    } else {
      logLine(service, `프로세스가 ${exitReason}로 종료되었습니다.`);
    }

    maybeExit();
  });

  child.on("error", (error) => {
    sawFailure = true;
    logLine(
      service,
      `프로세스를 시작하지 못했습니다: ${error.message}`,
      "stderr",
    );
  });
}

process.on("SIGINT", () => stopChildren("SIGINT"));
process.on("SIGTERM", () => stopChildren("SIGTERM"));
