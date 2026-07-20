import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { validateAnalysis } from "./util.js";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "key_points", "tags", "skill"],
  properties: {
    summary: { type: "string", description: "3-5 sentence summary of what the video teaches or shows" },
    key_points: { type: "array", items: { type: "string" }, description: "The concrete, actionable takeaways" },
    tags: { type: "array", items: { type: "string" }, description: "3-6 lowercase topic tags, e.g. cold-outreach, css, video-editing" },
    skill: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "skill_markdown"],
          properties: {
            name: { type: "string", description: "kebab-case skill name" },
            description: { type: "string", description: "One line: when Claude should use this skill" },
            skill_markdown: { type: "string", description: "Complete SKILL.md content including YAML frontmatter" },
          },
        },
      ],
    },
  },
};

const SYSTEM = `You analyze tutorial videos so the knowledge can be reused permanently by an AI coding agent (Claude Code or similar).

You receive the transcript plus sampled frames. The frames matter: for design breakdowns, code tutorials, and on-screen text, what is SHOWN often carries the real technique.

Produce a summary, concrete key takeaways, and topic tags.

Then decide: does this video teach a REUSABLE technique or process worth turning into an agent skill? Be picky. Motivation, opinions, news, entertainment, or vague advice: set skill to null. A genuine step-by-step method, framework, code technique, or design process: draft a skill.

A skill draft is a complete SKILL.md file:
---
name: <kebab-case>
description: Use when <specific trigger>. <What it provides.>
---
# <Title>
<The technique, written as instructions an agent can follow, with the concrete steps/numbers/examples from the video. Cite the source URL at the bottom.>

Write skills for the doer, not the watcher: capture exact steps, scripts, numbers, and examples from the video, not vague paraphrase.`;

export async function analyzeVideo({ url, title, author, transcript, framePaths }) {
  const client = new Anthropic();
  const images = framePaths.slice(0, 12).map((p) => ({
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: readFileSync(p).toString("base64") },
  }));
  const response = await client.messages.create({
    model: process.env.PRESS_MODEL || "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: [
        ...images,
        { type: "text", text: `Video URL: ${url}\nTitle: ${title || "unknown"}\nAuthor: ${author || "unknown"}\n\nTranscript:\n${transcript.slice(0, 60000)}` },
      ],
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined to analyze this video");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error(`no text in response (stop_reason=${response.stop_reason})`);
  const v = validateAnalysis(JSON.parse(text));
  if (!v.ok) throw new Error(`analysis failed validation: ${v.error}`);
  return v.value;
}
