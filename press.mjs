#!/usr/bin/env node
// skillpress-press: press a tutorial video into a SKILL.md your agent keeps forever.
// Usage: node --env-file=.env press.mjs <video-url> [--out <dir>]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cfg } from "./src/config.js";
import { workDirFor, fetchMetadata, fetchCaptions, transcribeAudio, extractFrames } from "./src/media.js";
import { analyzeVideo } from "./src/analyze.js";

const args = process.argv.slice(2);
const url = args.find((a) => a.startsWith("https://"));
const outFlag = args.indexOf("--out");
const outDir = outFlag > -1 ? args[outFlag + 1] : cfg.outDir;
if (!url) {
  console.log("Usage: node --env-file=.env press.mjs <video-url> [--out <dir>]");
  process.exit(1);
}

const t0 = Date.now();
console.log(`pressing ${url}`);
const dir = workDirFor("press-" + Math.abs([...url].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)));

const meta = await fetchMetadata(url);
console.log(`  "${meta.title}" by ${meta.author} (${meta.duration_s}s)`);
if (meta.duration_s > cfg.maxSeconds) {
  console.error(`  too long (${meta.duration_s}s > ${cfg.maxSeconds}s). Raise MAX_SECONDS if you mean it.`);
  process.exit(1);
}

let transcript = await fetchCaptions(url, dir);
if (transcript) console.log(`  captions found (${transcript.length} chars)`);
else {
  if (!cfg.whisperModel) {
    console.error("  no captions, and WHISPER_MODEL is not set (needed for local transcription). See README.");
    process.exit(1);
  }
  console.log("  no captions, transcribing with whisper (slower)…");
  transcript = await transcribeAudio(url, dir);
}

const framePaths = await extractFrames(url, dir, meta.duration_s);
console.log(`  ${framePaths.length} key frames extracted, analyzing…`);

const analysis = await analyzeVideo({ url, ...meta, transcript, framePaths });
console.log(`\nSummary: ${analysis.summary}\n`);

if (!analysis.skill) {
  console.log("Verdict: this video does not teach a pressable technique (no skill written). That is the press being picky, not broken.");
  process.exit(0);
}

const skillDir = path.join(outDir, analysis.skill.name);
mkdirSync(skillDir, { recursive: true });
writeFileSync(path.join(skillDir, "SKILL.md"), analysis.skill.skill_markdown);
console.log(`Pressed in ${Math.round((Date.now() - t0) / 1000)}s -> ${path.join(skillDir, "SKILL.md")}`);
console.log(`Your agent now knows "${analysis.skill.name}" in every future session.`);
