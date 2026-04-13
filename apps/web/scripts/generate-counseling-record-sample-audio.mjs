import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { counselingRecordSample20Min } from "./test-data/counseling-record-sample-20min-dialogue.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  projectRoot,
  "public",
  "test-data",
  "counseling-record-sample-20min.mp3",
);
const targetDurationSeconds =
  counselingRecordSample20Min.targetDurationSeconds ?? 1200;

const speakerFilters = {
  mentor:
    "highpass=f=120,lowpass=f=5200,asetrate=24000*0.965,aresample=24000,atempo=1.036,volume=1.05",
  student:
    "highpass=f=140,lowpass=f=5600,asetrate=24000*1.045,aresample=24000,atempo=0.957,volume=0.98",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentenceFragments(text) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[.!?])\s+/u)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
}

function chunkLongFragment(fragment, maxLength = 90) {
  if (fragment.length <= maxLength) {
    return [fragment];
  }

  const words = fragment.split(" ");
  const chunks = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = word;
      continue;
    }

    const pieces = word.match(new RegExp(`.{1,${maxLength}}`, "gu")) ?? [word];
    chunks.push(...pieces.slice(0, -1));
    current = pieces.at(-1) ?? "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function chunkText(text) {
  return splitSentenceFragments(text).flatMap((fragment) =>
    chunkLongFragment(fragment),
  );
}

async function runCommand(command, args) {
  const resolvedArgs =
    command === "ffmpeg"
      ? ["-hide_banner", "-loglevel", "error", ...args]
      : args;

  await new Promise((resolve, reject) => {
    const child = spawn(command, resolvedArgs, { stdio: "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function runAndCapture(command, args) {
  return await new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code ?? "unknown"}: ${stderr.trim()}`,
        ),
      );
    });
  });
}

async function probeDuration(filePath) {
  const output = await runAndCapture("ffprobe", [
    "-i",
    filePath,
    "-show_entries",
    "format=duration",
    "-v",
    "quiet",
    "-of",
    "csv=p=0",
  ]);

  return Number.parseFloat(output);
}

async function fetchTtsChunk(text, destinationPath) {
  const url = new URL("https://translate.googleapis.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("tl", "ko");
  url.searchParams.set("q", text);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `TTS request failed: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destinationPath, Buffer.from(arrayBuffer));
}

async function createSilence(durationSeconds, destinationPath) {
  await runCommand("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=24000:cl=mono",
    "-t",
    durationSeconds.toFixed(3),
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    destinationPath,
  ]);
}

async function concatAudioFiles(filePaths, destinationPath) {
  const concatListPath = path.join(
    path.dirname(destinationPath),
    `${path.basename(destinationPath, path.extname(destinationPath))}.txt`,
  );
  const concatList = filePaths
    .map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`)
    .join("\n");

  await writeFile(concatListPath, concatList, "utf8");

  await runCommand("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-ar",
    "24000",
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    destinationPath,
  ]);
}

async function synthesizeUtterance(workDir, utterance, index) {
  const rawChunks = [];
  const chunks = chunkText(utterance.text);

  for (const [chunkIndex, chunkTextValue] of chunks.entries()) {
    const chunkPath = path.join(
      workDir,
      `utterance-${String(index).padStart(3, "0")}-chunk-${String(chunkIndex).padStart(2, "0")}.mp3`,
    );
    await fetchTtsChunk(chunkTextValue, chunkPath);
    rawChunks.push(chunkPath);
    await sleep(150);
  }

  const mergedRawPath = path.join(
    workDir,
    `utterance-${String(index).padStart(3, "0")}-raw.mp3`,
  );
  await concatAudioFiles(rawChunks, mergedRawPath);

  const processedPath = path.join(
    workDir,
    `utterance-${String(index).padStart(3, "0")}.mp3`,
  );
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    mergedRawPath,
    "-filter:a",
    speakerFilters[utterance.speaker],
    "-ar",
    "24000",
    "-ac",
    "1",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    processedPath,
  ]);

  return processedPath;
}

async function buildConversationTrack(workDir) {
  const sequenceFiles = [];

  for (const [
    index,
    utterance,
  ] of counselingRecordSample20Min.utterances.entries()) {
    const utterancePath = await synthesizeUtterance(workDir, utterance, index);
    sequenceFiles.push(utterancePath);

    const pauseAfterSeconds = utterance.pauseAfterSeconds ?? 0.65;
    const pausePath = path.join(
      workDir,
      `pause-${String(index).padStart(3, "0")}.mp3`,
    );
    await createSilence(pauseAfterSeconds, pausePath);
    sequenceFiles.push(pausePath);
  }

  const assembledPath = path.join(workDir, "conversation-assembled.mp3");
  await concatAudioFiles(sequenceFiles, assembledPath);
  return assembledPath;
}

function formatAtempoChain(targetRatio) {
  const factors = [];
  let ratio = targetRatio;

  while (ratio < 0.5) {
    factors.push(0.5);
    ratio /= 0.5;
  }

  while (ratio > 2.0) {
    factors.push(2.0);
    ratio /= 2.0;
  }

  factors.push(Number(ratio.toFixed(6)));
  return factors.map((factor) => `atempo=${factor}`).join(",");
}

async function finalizeDuration(assembledPath, finalOutputPath) {
  const assembledDuration = await probeDuration(assembledPath);
  const ratio = assembledDuration / targetDurationSeconds;
  const adjustedPath = path.join(
    path.dirname(assembledPath),
    "conversation-adjusted.mp3",
  );

  if (ratio > 1.001 || ratio < 0.92) {
    if (ratio > 1.001) {
      await runCommand("ffmpeg", [
        "-y",
        "-i",
        assembledPath,
        "-filter:a",
        formatAtempoChain(ratio),
        "-ar",
        "24000",
        "-ac",
        "1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        adjustedPath,
      ]);
    } else {
      await runCommand("ffmpeg", [
        "-y",
        "-i",
        assembledPath,
        "-af",
        `apad=pad_dur=${(targetDurationSeconds - assembledDuration).toFixed(3)}`,
        "-t",
        targetDurationSeconds.toFixed(3),
        "-ar",
        "24000",
        "-ac",
        "1",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        adjustedPath,
      ]);
    }
  } else if (ratio < 0.999) {
    await runCommand("ffmpeg", [
      "-y",
      "-i",
      assembledPath,
      "-filter:a",
      `${formatAtempoChain(ratio)},apad=pad_dur=2`,
      "-t",
      targetDurationSeconds.toFixed(3),
      "-ar",
      "24000",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      adjustedPath,
    ]);
  } else {
    await writeFile(finalOutputPath, await readFile(assembledPath));
    return {
      assembledDuration,
      finalDuration: assembledDuration,
    };
  }

  await mkdir(path.dirname(finalOutputPath), { recursive: true });
  await writeFile(finalOutputPath, await readFile(adjustedPath));

  return {
    assembledDuration,
    finalDuration: await probeDuration(finalOutputPath),
  };
}

async function main() {
  const keepTemp = process.argv.includes("--keep-temp");
  const workDir = await mkdtemp(
    path.join(os.tmpdir(), "yeon-counseling-record-sample-"),
  );

  try {
    console.log(
      `[audio] generating ${counselingRecordSample20Min.title} -> ${outputPath}`,
    );
    const assembledPath = await buildConversationTrack(workDir);
    const { assembledDuration, finalDuration } = await finalizeDuration(
      assembledPath,
      outputPath,
    );

    console.log(
      `[audio] assembled duration: ${assembledDuration.toFixed(3)}s | final duration: ${finalDuration.toFixed(3)}s`,
    );
    console.log(
      `[audio] personas: mentor=${counselingRecordSample20Min.personas.mentor.name}, student=${counselingRecordSample20Min.personas.student.name}`,
    );
  } finally {
    if (!keepTemp) {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}

await main();
