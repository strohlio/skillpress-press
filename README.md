# skillpress-press

Press a tutorial video into a permanent skill for your AI coding agent.

A video goes in. The press pulls the transcript (captions, or whisper when there are none) and the key frames, then a frontier model distills the *actual technique* — steps, numbers, code, gotchas — into a `SKILL.md` your agent reads in every future session. Watch it once, keep the skill forever.

This is the open-source engine behind [skillpress.dev](https://skillpress.dev). Prompt engineering got you better answers; context engineering got you better sessions; [skill engineering](https://skillpress.dev/skill-engineering/) gets your agent permanent capabilities.

## Requirements

- Node 20.6+
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and [`ffmpeg`](https://ffmpeg.org) on your PATH (handles YouTube, TikTok, X, Vimeo, Loom, and ~1,800 other sites)
- An Anthropic API key (a pressing costs roughly $0.10 of Opus)
- Optional: [`whisper-cli`](https://github.com/ggml-org/whisper.cpp) + a model file, only needed for videos without captions

## Quickstart

```bash
git clone https://github.com/strohlio/skillpress-press && cd skillpress-press
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
node --env-file=.env press.mjs "https://www.youtube.com/watch?v=phWxA89Dy94"
```

The pressed skill lands in `~/.claude/skills/<name>/SKILL.md` (change with `--out <dir>` or `SKILLS_DIR`). Claude Code picks it up automatically; any agent that reads instruction files can use it — for Codex, append the content to your `AGENTS.md`.

## What makes a pressing good

The press is deliberately picky. Motivation, opinions, news, entertainment: no skill is written, and that is the press working, not failing. A genuine step-by-step method, framework, or code technique gets captured with the exact steps, scripts, and numbers from the video — written for the doer, not the watcher. Every skill cites its source video at the bottom: creators deserve the credit and the click.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | The model that does the distilling |
| `PRESS_MODEL` | `claude-opus-4-8` | Swap in a cheaper model if you like |
| `SKILLS_DIR` | `~/.claude/skills` | Where pressed skills land |
| `WORK_DIR` | `./work` | Scratch space for downloads/frames |
| `WHISPER_MODEL` | (unset) | Path to a whisper.cpp model, for caption-less videos |
| `MAX_SECONDS` | `1800` | Refuse videos longer than this |

## The hosted version

[skillpress.dev](https://skillpress.dev) runs this same press as a service, plus the parts that don't fit in a CLI: a curated library of tested skills, a community shelf of member pressings, and an MCP server so your Claude or Codex can browse and install skills by itself (`claude mcp add skillpress …`). Three skills are free.

## License

MIT. Skills you press from others' videos carry their creators' knowledge — keep the source citations intact and be generous with credit.
