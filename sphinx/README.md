# SPHINX — atmospheric 3D mystery (Part 1)
Next.js 14 (App Router) · React Three Fiber · Tailwind · Lucide · Supabase (Google OAuth + cloud saves)

## Install
```bash
npm install
cp .env.example .env.local   # fill the 3 variables below
npm run dev                  # http://localhost:3000
```

## Environment variables
| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID. Paste it, with its secret, into Supabase → Authentication → Providers → Google |

## Supabase setup
1. Run `supabase/schema.sql` in the SQL editor (tables `profiles`, `user_saves`, RLS policies, auto-profile trigger).
2. Enable the Google provider; add `http://localhost:3000` and your production URL to Authentication → URL Configuration.
3. In Google Cloud, add the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) as an authorized redirect URI.

## 3D assets (`/public/models/`)
| Scene id / role | File |
|---|---|
| `bathroom_interior` | `bathroom_interior.glb` |
| `abandoned_warehouse` | `abandoned_warehouse_-_interior_scene.glb` |
| `southwark_borough_bunker` | `southwark_borough_control_bunker.glb` |
| `st_pancras_new_church_crypt` | `st_pancras_new_church_crypt.glb` |
| `the_hallwyl_museum` | `the_hallwyl_museum_1st_floor_combined.glb` |
| Player (`algerian_man`) | `algerian_man.glb` |
| Nour | `beautiful_young_woman_wearing_a_floral_dress.glb` |

Unused extras (`hintze_hall`, `crystal_palace_cinema`, `casa_gassia`) can be added to `lib/scenes.ts`.
Edit `scale`, `spawn`, fog and `signal` per scene in `lib/scenes.ts` — Sketchfab models use arbitrary units, so tune `scale` until a door is ~2 m tall.
For low-end phones compress GLBs: `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`.

## Controls
PC: click to lock mouse · WASD · Shift sprint · C crouch · F flashlight · P phone · I inventory. Touch: joystick (drag fully up = sprint), buttons, drag right side to look.

## Structure
`app/` page + layout · `components/` Game (screens, auth UI, loading), GameCanvas, SceneModel, Player, Cutscene, Hud, Phone · `lib/` store, i18n (EN/AR, RTL), scenes, saves, supabase · `supabase/schema.sql`

## Status
Done: scene loader, first-person controller (stamina, bobbing, breathing/footstep SFX, crouch, flashlight, collisions), quality presets, EN/AR switching, Google login, cloud + local saves, phone (signal, Nour thread, camera achievement, emergency-call event), Part 1 cutscene with glass wall + "To Be Continued".
Next: full settings/profile/legal modals, inventory grid with 3D inspect and combining, per-scene puzzles and clue targets, loading-screen artwork, audio assets.
