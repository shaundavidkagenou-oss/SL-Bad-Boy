# Lanka Run: Schoolboy Rush

An original 3D Sri Lankan endless runner built with **Three.js, JavaScript and Vite**. Phase 2 upgrades the playable Phase 1 game with themed districts, richer procedural art, articulated animation, a non-catching Sri Lankan police pursuit, oncoming buses, polished presentation, touch input and synthesized audio. All models, road textures, signs and sounds are generated locally; no branded game assets or CDN scripts are used.

## Play on Windows

### Easiest option

1. Install **Node.js 22 or newer** and a current Chrome, Edge, or Firefox browser with hardware acceleration enabled.
2. Double-click **`play-windows.bat`**.
3. The first launch installs dependencies, starts the game and opens the browser. Later launches skip installation.

### Manual launch

```bat
npm install
npm run dev -- --host 127.0.0.1 --open
```

If the browser does not open automatically, visit `http://127.0.0.1:5173`.

For a production build:

```bat
npm run build
npm run preview -- --host 127.0.0.1 --open
```

The static production site is generated in `dist/`. Serve it over HTTP rather than opening `index.html` through `file://`.

## Controls

| Input | Action |
| --- | --- |
| Left Arrow or A | Move one lane left |
| Right Arrow or D | Move one lane right |
| Space | Jump |
| Down Arrow or S | Slide; fast-fall while airborne |
| Escape | Pause or resume |
| Enter | Play, resume or restart from the relevant screen |
| Touch swipe left/right | Change lanes on touch devices |
| Touch swipe up/down | Jump or slide on touch devices |

Menus and the HUD pause button are clickable. The sound button toggles mute and remembers the preference. Audio is initialized only after user interaction to comply with browser autoplay rules.

## Phase 2 features

### Sri Lankan world

- Three naturally transitioning themes: **Colombo city streets**, **Maharagama garden suburbs**, and **Pettah town market**.
- Detailed commercial buildings with shopfronts, shutters, balconies, side windows, awnings, rooftop tanks and varied proportions.
- Residential houses, tiled roofs, verandas, boundary walls, gates and gardens.
- Market stalls with striped awnings, crates and procedural produce.
- Coconut palms, tropical trees, local advertising, bus shelters, pavements, drains, utility poles and continuous overhead wires.
- Decorative junctions, traffic lights, parked cars/vans/tuk-tuks, street bins and an original distant island skyline.
- Guaranteed Sinhala roadside boards in every section, plus Sinhala shopfronts, road names, school-zone signs and bus destinations.
- Selected signs use correct Sinhala, Tamil and English text with locally bundled Noto fonts and an English fallback.
- Procedural asphalt, paving and plaster materials, atmospheric color transitions and district announcements.

### Character and traffic

- Detailed articulated schoolboy with connected shoulders, elbows, wrists, hips, knees and ankles, plus an improved face, hair, uniform, backpack, socks and shoes.
- Continuous running cycle, foot roll, wrist motion, head movement, backpack bounce, menu wave, coin celebration, jump tuck, landing compression, lean-back slide, lane-change lean and collision stumble.
- Original Sri Lankan police officer in a khaki uniform, navy peaked cap, belt and boots, with detailed facial features, fingers, collar, seams, pockets, pouches, radio, boot laces and Sinhala/English back patch.
- Pelvis/torso counter-motion, heel-to-toe movement, baton follow-through, a pursuit point, split-leg hurdles, landing compression, braced slides and a catch-breath stop reaction.
- The officer follows at the player's shoulder, reacts to road hazards and always maintains a guaranteed gap; he never catches the player or causes a collision.
- Red-and-white public buses and four colourful private-bus palettes with windshields, doors, windows, trim, lights, mirrors and destination boards.
- A deterministic subset of buses approaches under its own power with extra following space and swept collision coverage; other traffic retains road speed.
- Cars, a compact van, improved three-wheeled tuk-tuks and travel-driven wheel rotation.
- Original obstacle models remain matched to the Phase 1 collision dimensions and fair spawn patterns.

### Presentation and feedback

- A five-second black-and-white **Shaun David Studios** production ident with an original S/D monogram, scanlines, animated typography, timed progress and a readiness-based handoff.
- The intro remains until local fonts and the 3D game are ready, then exits cleanly; it is responsive and respects reduced-motion preferences.
- Smoothed third-person camera with restrained lane/jump following and a portrait-specific view.
- Polished title screen, HUD, district pill/banner, coin feedback, pause treatment, impact flash and game-over presentation.
- Original Web Audio synthesis for coins, jumping, landing, sliding, collisions, buttons, ambient traffic and distant bus horns.
- Persistent mute preference, desktop keyboard input and mobile touch gestures.

### Endless performance design

- The original nine connected road centers and gap-free recycling math are preserved.
- Scenery uses seeded variants and changes only when sections recycle; queued rebuilds are limited to one per update.
- Unit primitive geometries, shared materials/textures and bounded label caches prevent resource growth from procedural variation.
- Removed scenery groups become garbage-collectable while shared GPU resources remain reusable.
- Obstacle spawning and decorative world generation remain separate.
- Pixel ratio is capped, with a lower cap for coarse-pointer/mobile devices.

Scoring remains **10 points per metre + 100 points per coin**. Speed rises from 14 to 36 world units/second. Best score and mute preference use browser `localStorage`; blocked storage does not prevent play.

## Project structure

```text
index.html                     UI screens, HUD and accessibility labels
play-windows.bat               Windows launcher
src/main.js                    Font loading and game bootstrap
src/styles.css                 Responsive desktop/mobile interface
src/config.js                  Lane, physics and collider constants
src/art/MeshKit.js             Shared geometry, procedural surfaces and sign textures
src/art/Schoolboy.js           Original detailed articulated schoolboy
src/art/Policeman.js           Original uniformed Sri Lankan police officer
src/art/Vehicles.js            Original buses, cars, van, tuk-tuks and hazards
src/art/Environment.js         Themed buildings, plants, signs and street furniture
src/game/Game.js               Game state and single animation loop
src/game/Player.js             Movement and articulated animation
src/game/PoliceChase.js        Non-catching pursuit, hazard response and safe gap
src/game/CameraRig.js          Smoothed desktop/portrait camera
src/game/AudioManager.js       Gesture-unlocked synthesized audio
src/game/WorldGenerator.js     Road recycling and seeded themed scenery
src/game/EnvironmentThemes.js  Pure district schedule and theme definitions
src/game/ObstacleSpawner.js    Traffic/coin lifecycle, collisions and wheel travel
src/game/PatternPlanner.js     Fair gameplay-row generation
src/game/InputController.js    Keyboard and touch gestures
src/game/ScoreManager.js       Score and persistent best record
src/ui/GameUI.js               HUD, menus, district and feedback presentation
src/ui/SignFonts.js            Local Sinhala/Tamil font loading and fallback
assets/icon.svg               Original game icon
tests/                        Phase 1 regressions and Phase 2 coverage
```

## Verification

Run the production build and all Node tests:

```bash
npm test
npm run build
```

The suite retains every Phase 1 assertion and adds district scheduling, bounded geometry caching, touch gestures, articulated landing and coin reactions, lazy audio/mute persistence, travel-driven wheels, genuinely oncoming buses, police uniform joints and a non-catching pursuit gap.

The optional real Chromium/WebGL suite starts its own Vite server:

```bash
npm install --no-save --package-lock=false puppeteer-core@25.15.0 @sparticuz/chromium@153.0.0
npm run test:browser
```

It checks the five-second studio intro and desktop/mobile wordmark bounds, startup, audio unlock/mute, keyboard and real dispatched touch input, regular and oncoming traffic, detailed police pursuit and pointing, coins and celebration, jump/slide collision behavior, game over, pause/resume, clean restart, saved best score, road/ground ordering, real Sinhala sign meshes and local fonts, portrait mobile layout, and 7,200 metres of themed recycling with stable scene/GPU resource counts. Screenshots are written to the ignored `test-results/` directory.

To use an installed Chrome/Chromium instead of the optional package, set `CHROME_PATH` to its executable. The resource stress test is not a hardware-specific GTX or mobile-device frame-rate benchmark.
