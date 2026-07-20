const die = (msg) => { console.error(msg); process.exit(1); };

if (!process.env.ANTHROPIC_API_KEY) {
  die("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key, then run with: node --env-file=.env press.mjs <url>");
}

export const cfg = {
  workDir: process.env.WORK_DIR || "./work",
  // Only needed when a video has no captions and audio must be transcribed locally.
  whisperModel: process.env.WHISPER_MODEL || "",
  outDir: process.env.SKILLS_DIR || `${process.env.HOME}/.claude/skills`,
  maxSeconds: Number(process.env.MAX_SECONDS || 1800),
};
