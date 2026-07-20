import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, rmSync, readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { cfg } from "./config.js";
import { parseVtt } from "./util.js";

const run = promisify(execFile);
const YTDLP_OPTS = ["--no-playlist", "--socket-timeout", "30"];

export function workDirFor(videoId) {
  const dir = path.join(cfg.workDir, String(videoId));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

export async function fetchMetadata(url) {
  const { stdout } = await run("yt-dlp", [...YTDLP_OPTS, "-J", url], { maxBuffer: 64 * 1024 * 1024 });
  const m = JSON.parse(stdout);
  return {
    title: m.title || null,
    author: m.uploader || m.channel || null,
    thumbnail_url: m.thumbnail || null,
    duration_s: Math.round(m.duration || 0),
  };
}

export async function fetchCaptions(url, dir) {
  try {
    await run("yt-dlp", [...YTDLP_OPTS, "--skip-download", "--write-subs", "--write-auto-subs",
      "--sub-langs", "en.*,en,-live_chat", "--sub-format", "vtt", "-o", path.join(dir, "subs"), url]);
  } catch { return null; }
  const vttFile = readdirSync(dir).find((f) => f.startsWith("subs") && f.endsWith(".vtt"));
  if (!vttFile) return null;
  const text = parseVtt(readFileSync(path.join(dir, vttFile), "utf8"));
  return text.length > 40 ? text : null;
}

export async function transcribeAudio(url, dir) {
  const audioBase = path.join(dir, "audio");
  await run("yt-dlp", [...YTDLP_OPTS, "-x", "--audio-format", "wav",
    "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1", "-o", audioBase, url]);
  const wav = `${audioBase}.wav`;
  if (!existsSync(wav)) throw new Error("audio download produced no wav");
  const outBase = path.join(dir, "transcript");
  await run("whisper-cli", ["-m", cfg.whisperModel, "-f", wav, "-otxt", "-of", outBase, "-np"], { maxBuffer: 64 * 1024 * 1024 });
  const text = readFileSync(`${outBase}.txt`, "utf8").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("whisper produced empty transcript");
  return text;
}

export async function extractFrames(url, dir, durationS) {
  const videoPath = path.join(dir, "video.mp4");
  await run("yt-dlp", [...YTDLP_OPTS, "-f", "bv*[height<=720]+ba/b[height<=720]/b",
    "--merge-output-format", "mp4", "-o", videoPath, url]);
  const framesDir = path.join(dir, "frames");
  mkdirSync(framesDir, { recursive: true });
  await run("ffmpeg", ["-i", videoPath, "-vf", "select='gt(scene,0.3)',scale=768:-2,format=yuvj420p",
    "-frames:v", "12", "-vsync", "vfr", "-q:v", "5", path.join(framesDir, "f%02d.jpg")]);
  let frames = readdirSync(framesDir).filter((f) => f.endsWith(".jpg"));
  if (frames.length < 4) {
    const interval = Math.max((durationS || 60) / 10, 2);
    await run("ffmpeg", ["-y", "-i", videoPath, "-vf", `fps=1/${interval},scale=768:-2,format=yuvj420p`,
      "-frames:v", "10", "-q:v", "5", path.join(framesDir, "u%02d.jpg")]);
    frames = readdirSync(framesDir).filter((f) => f.endsWith(".jpg"));
  }
  return frames.sort().slice(0, 12).map((f) => path.join(framesDir, f));
}
