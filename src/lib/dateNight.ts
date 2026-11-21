import { PLAYABLE } from "./games/registry";

export type Theme = "Cozy Night" | "Game Night" | "Romantic Night" | "Deep Talks" | "Worship Together";
export const THEMES: Theme[] = ["Cozy Night", "Game Night", "Romantic Night", "Deep Talks", "Worship Together"];

export interface Activity {
  id: string;
  kind: "game" | "prompt";
  title: string;
  body?: string;       // prompt text
  gameId?: string;
  themes: Theme[];     // empty = any
}

// Only activities that are genuinely usable today: playable games + conversation/creative prompts.
// Photo booth, Bible and music-guessing activities join this list as those sections ship.

const prompt = (id: string, title: string, body: string, themes: Theme[] = []): Activity =>
  ({ id, kind: "prompt", title, body, themes });

export const ACTIVITIES: Activity[] = [
  ...PLAYABLE.map<Activity>(g => ({ id: `game:${g.id}`, kind: "game", title: g.title, gameId: g.id, themes: ["Game Night", "Cozy Night"] })),
  prompt("deep-1", "Five deep questions", "Take turns asking each other: What moment from this year are you most grateful for? What are you afraid to hope for? What did you need to hear as a child? What does home feel like? What do you want us to be like in ten years?", ["Deep Talks", "Romantic Night"]),
  prompt("draw-60", "Draw each other in 60 seconds", "Both grab paper. One minute on the clock. Hold your drawings up to the camera at the same moment.", ["Cozy Night", "Game Night"]),
  prompt("five-words", "Five words", "Describe each other in exactly five words. Reveal on three.", ["Romantic Night", "Deep Talks"]),
  prompt("dream-trip", "Plan an imaginary holiday", "You have a budget of 3,000 for two. Where do you go, and what's the first thing you do when you land?", ["Cozy Night", "Romantic Night"]),
  prompt("old-photo", "Share an old photograph", "Each find one old photo and tell the story behind it.", ["Cozy Night", "Deep Talks"]),
  prompt("laugh", "Make each other laugh without speaking", "Mime, faces and noises only. First to crack loses.", ["Game Night"]),
  prompt("read-pray", "Read and pray together", "Read a short passage of Scripture you both like, then take a quiet minute and pray for each other.", ["Worship Together"]),
  prompt("gratitude", "Three gratitudes", "Each share three things you're thankful for about today, then three about each other.", ["Worship Together", "Romantic Night"]),
  prompt("slow-dance", "A slow dance on camera", "Pick the next song together and dance, however silly it looks.", ["Romantic Night"]),
];

/** Pick an activity, avoiding recent ones and preferring the tonight's theme. */
export function pickActivity(theme: Theme | null, recentIds: string[]): Activity {
  const fresh = ACTIVITIES.filter(a => !recentIds.includes(a.id));
  const pool = fresh.length ? fresh : ACTIVITIES;
  const themed = theme ? pool.filter(a => a.themes.includes(theme)) : [];
  const from = themed.length ? themed : pool;
  return from[Math.floor(Math.random() * from.length)];
}
