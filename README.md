# Our Little Place

Private two-person site for Keith & Molly. Next.js 14 + Supabase (Auth, Postgres, Realtime, Storage) + WebRTC.

## Setup
1. Create a Supabase project. In Auth settings, **disable open sign-ups after Molly joins** (or keep them off and use the invite flow only).
2. Run `supabase/migrations/001_init.sql` then `002_chat_and_invites.sql` in the SQL editor, then the bootstrap lines at the bottom (create space, your member row, an invite code for Molly).
3. `cp .env.example .env.local`, fill in the Supabase URL/anon key. Add a TURN server for reliable video across networks. Optionally set `NEXT_PUBLIC_TOGETHER_SINCE=YYYY-MM-DD`.
4. `npm install && npm run dev`.

## Architecture
- `src/components/SpaceProvider.tsx`: auth, membership, the single realtime channel per space, the call and the synced music player. Mounted in `(app)/layout.tsx`, so call and music survive navigation.
- `src/lib/useSpaceChannel.ts`: presence + broadcast. `src/lib/useCall.ts`: WebRTC with perfect negotiation, signalling over the channel.
- `src/lib/games/`: `GameDef` contract (pure reducer + Board component). Add a game by writing one file and adding it to `registry.ts`; the arcade, the sync room and Date Night pick it up.
- `src/lib/dateNight.ts` + `(app)/date-night/page.tsx`: One-Click Date Night.
- RLS: every table is limited to members of the space; storage bucket `media` is private with per-space folders; `redeem_invite` caps a space at two members.

## Status
Done: design system, login + invite redemption, home, floating call, mini-player (MP3 upload, synced play/pause/seek/skip, auto-advance), game room engine, 7 playable games (Tic-Tac-Toe, Connect Four, Rock Paper Scissors, Gomoku, Reversi, Mancala, Dots and Boxes; reducers covered by scripted playthroughs), private chat (text, images, voice, replies, reactions, pins, delete, read receipts, typing, search), One-Click Date Night (themes, history, favourites, persistent offline invitation).
Not yet built: Music Room page (playlists, queue UI, lyrics, covers), the other Phase 1 games (Chess, Checkers, Battleship, ...), and everything in Phases 2 and 3.
Not yet tested against a live Supabase project or across two real devices: realtime, WebRTC and synced audio need a first run with you and Molly.

## Together view (video call)
Start a call from the pill at the top right (any page). The small window follows you around the site; "Together" opens the big shared stage:
doodle on top of the call (synced live, both can draw), stamps, shared scenes/frames/filters, hugs and hearts, and a Snapshot button that saves a polaroid-style PNG of you both plus your doodles.

## Previewing the front end without a backend
`NEXT_PUBLIC_PREVIEW=1 npm run dev` (Windows PowerShell: `$env:NEXT_PUBLIC_PREVIEW=1; npm run dev`), then open http://localhost:3000.
Skips login, shows Keith & Molly, games are hot-seat. Video, chat, music upload and saving do not work in this mode (they need Supabase).

## Look and feel
Fonts (Playfair Display, Nunito, Kalam) are bundled via `@fontsource`, so they load offline. Cursors are defined in `src/app/globals.css` (`--cursor-default`, `--cursor-pointer`); the doodle canvas builds a brush cursor in `DrawLayer.tsx`.

## During a call
Your video is pinned to the far left, hers to the far right, and the page (game, chat, anything) sits between you; on phones the two videos sit in a strip above the page.
"Share screen" starts Watch together: pick a browser tab (tick "Also share tab audio" for sound) or a window. Works in Chrome/Edge on a computer; phones can't share their screen, and Firefox/Safari can't share audio.


## Logging in (ID + password)
You each pick your own ID and password. Under the hood the ID becomes a private address (`yourid@ourplace.app`), so no real email is needed.
In Supabase go to Authentication -> Providers -> Email and turn OFF "Confirm email", otherwise sign-up waits for a confirmation mail that never arrives.
First person: create the space with the bootstrap SQL, then both of you sign up with the invite code. After that, sign in on any device with your ID.

## The "OS" layout
- Top menu bar: where you are, who's online, both clocks, what's playing, wave, call.
- Dock at the bottom: every app. During a call the call controls (mic, camera, share screen, love, layout, together view, end) sit in the same bar.
- Call layout (Meet-style): cameras are rectangles on both sides, your app/game in the middle. While someone shares a screen, the cameras shrink and the shared screen takes the middle.
- Layout button: "Both sides" or "Stacked right", and Small/Medium/Big cameras. This is per device; frame, filter and place are shared.
- Cozy level: one point per minute together on a call (stored on each device).

## Dark mode and Christmas mode
Two small buttons in the top bar: 🌙/☀️ for dark mode and 🎄 for Christmas mode (twinkling lights, snow, decorations, a festive palette and a Merry Christmas greeting). They combine, and each device remembers its own choice.

## Photo Booth
Open the Photo Booth from the dock. Pick "Just me" or, during a video call, "Both of us" (you and your person side by side in every shot). It takes a single photo or a 4-photo strip with a 3-2-1 countdown, and your person sees the countdown too. Choose a look, frame colour, stickers and caption, then download the picture or save it to the shared album (stored privately in Supabase Storage under `photos/`).

## Look and layout (latest)
- Colours: white and black, with pink, purple, blue, green, yellow and brown. Dark mode and Christmas mode are on by default; both can be toggled in the top bar.
- Layout: top tabs on computers, bottom tab bar on phones; the home page and Date Night open with both of you as big camera rectangles.
- Games use original illustrated artwork (`src/components/GameArt.tsx`, one drawing per game id).
- Photo Booth face filters (`src/lib/faceFilters.ts`): mustache, puppy, kitty, bunny, Santa hat, reindeer, crown, shades, flower crown. They use MediaPipe face landmarks, loaded from a CDN the first time (needs internet).
