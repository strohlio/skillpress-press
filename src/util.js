export function parseVtt(vtt) {
  const lines = vtt
    .split("\n")
    .map((l) => l.replace(/<[^>]+>/g, "").trim())
    .filter((l) => l && l !== "WEBVTT" && !/^\d+$/.test(l) && !l.includes("-->") && !l.startsWith("NOTE") && !/^(Kind|Language):/.test(l));
  const seen = new Set();
  const deduped = [];
  for (const line of lines) if (!seen.has(line)) { seen.add(line); deduped.push(line); }
  return deduped.join(" ").replace(/\s+/g, " ").trim();
}

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export function validateAnalysis(a) {
  if (!a || typeof a.summary !== "string" || !a.summary) return { ok: false, error: "missing summary" };
  if (!Array.isArray(a.key_points) || !Array.isArray(a.tags)) return { ok: false, error: "key_points/tags must be arrays" };
  if (a.skill !== null && a.skill !== undefined) {
    const s = a.skill;
    if (!s.name || !s.description || !s.skill_markdown) return { ok: false, error: "incomplete skill draft" };
    a.skill = { ...s, name: slugify(s.name) };
    if (!a.skill.name) return { ok: false, error: "skill name slugified to empty" };
  } else a.skill = null;
  return { ok: true, value: a };
}
