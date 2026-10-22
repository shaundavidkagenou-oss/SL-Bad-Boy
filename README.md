# SL BAD BOY — Schoolboy Rush

An original 3D Sri Lankan endless runner for **web and Android**, built with **Three.js, JavaScript, Vite and Capacitor**. It includes ten long themed districts, original landmark scenery, hill-country tunnels, articulated characters, a Sri Lankan police pursuit, a 10-second scooter boost, fair speed-scaled traffic, touch buttons/gestures and synthesized audio. Models, textures, signs, icons and sounds are generated locally; no branded game assets, CDN scripts or copyrighted Subway Surfers content are used.

## Android APK

**Package:** `lk.shaun.slbadboy` · **App name:** `SL BAD BOY` · **Minimum:** Android 7.0 (API 24) · **Target:** API 36.

- Direct branch download: **[artifacts/SL-BAD-BOY.apk](artifacts/SL-BAD-BOY.apk)** (produced and validated by the Android workflow).
- GitHub Actions also publishes the same package as the **SL-BAD-BOY-APK** workflow artifact with a SHA-256 checksum.
- The supplied APK is **debug-signed for direct installation/testing**, not signed for Play Store release. Android may ask you to allow installation from your browser/file manager.
- The complete game, fonts and procedural artwork are bundled inside the APK. Gameplay does not require a server or network connection.

### One-click Windows APK build

Install these prerequisites once:

1. **Node.js 22+**.
2. **Java 17** (available through Android Studio or a JDK) with `java` on PATH or `JAVA_HOME` set.
3. **Android Studio/SDK** with Android SDK 36 and build tools, with `ANDROID_HOME`/`ANDROID_SDK_ROOT` set or `android/local.properties` configured by Android Studio.

Then double-click **`build-apk.bat`**. It installs exact Node dependencies when needed, builds the full web game, regenerates original launcher/splash artwork, syncs Capacitor, runs Gradle, checks the resulting file, and copies it to:

```text
artifacts\SL-BAD-BOY.apk
```

For Android Studio development, use `npm run android:sync`, then `npm run android:open`. `npm run assets:android` regenerates only the native artwork. Do not edit `android/app/src/main/assets/public/` manually; it is generated from `dist/` by Capacitor.

### Automated APK build

`.github/workflows/android-apk.yml` runs on this branch and through **Run workflow**. It uses Node 22 and Java 17, runs the logic tests and production build, compiles the APK, checks the ZIP structure and offline game files, verifies package name/app label/minimum SDK with `aapt`, uploads the artifact, and commits the verified APK/checksum back to the branch.

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
| On-screen Left/Right/Jump/Slide buttons | Direct mobile controls during a run |
| Android Back | Pause/resume; game over returns to menu; menu exits the app |

Menus and the HUD pause button are clickable. The sound button toggles mute and remembers the preference. Audio is initialized only after user interaction to comply with browser autoplay rules. Android app backgrounding pauses an active run. The HUD, menus, loader and controls account for portrait/landscape layouts and display safe areas.

## Game features

### Sri Lankan world

- Ten naturally transitioning **240 m districts**: Colombo, Maharagama, Pettah, Kotte, Kandy, Kadugannawa, Nuwara Eliya, Ella, Galle and Negombo.
- Original procedural landmarks including Galle Face/Lotus Tower, Pettah clock tower, Diyawanna parliament, Kandy temple/lake, Galle lighthouse, Nine Arches Bridge, tea country, railway scenery and Negombo lagoon.
- Two consecutive-section tunnel runs in Kadugannawa and Ella, with portals, interior strip lights and camera-safe roof clearance.
- Detailed commercial buildings with district-specific palettes, shopfronts, shutters, balconies, side windows, awnings, rooftop tanks and varied proportions.
- Residential houses, tiled roofs, verandas, boundary walls, gates and gardens.
- Market stalls with striped awnings, crates and procedural produce.
- Coconut palms, banana plants, tropical trees, local advertising, bus shelters, pavements, drains, utility poles and continuous overhead wires.
- Decorative junctions, traffic lights, parked cars/vans/tuk-tuks, street bins and an original distant island skyline.
- Sinhala roadside boards throughout ordinary road sections, plus district-matched shopfronts, road names, school-zone signs and bus destinations.
- Selected signs use correct Sinhala, Tamil and English text with locally bundled Noto fonts and an English fallback.
- Procedural asphalt, grass, paving, plaster, roof-tile and water materials with local color/height textures, plus atmospheric color transitions and district announcements.

### Character and traffic

- Detailed articulated schoolboy with connected shoulders, elbows, wrists, hips, knees and ankles, plus an improved face, hair, uniform, backpack, socks and shoes.
- Continuous running/control animation with foot roll, head movement, backpack bounce, jump tuck, landing compression, lean-back slide, lane-change lean and collision stumble. The former menu wave and coin arm celebration are intentionally removed.
- Original Sri Lankan police officer in a khaki uniform, navy peaked cap, belt and boots, with detailed facial features, fingers, collar, seams, pockets, pouches, radio, boot laces and Sinhala/English back patch.
- Pelvis/torso counter-motion, heel-to-toe movement, baton follow-through, a pursuit point, split-leg hurdles, landing compression, braced slides and a catch-breath stop reaction.
- The officer is hidden on the menu, sprints in when the run starts, follows at the player's shoulder and reacts to road hazards. He never catches the player or causes a collision; a scooter boost lets him fall far behind before he returns.
- Red-and-white public buses and four colourful private-bus palettes with windshields, doors, windows, trim, lights, mirrors and destination boards.
- A deterministic subset of buses approaches under its own power with extra following space and swept collision coverage; other traffic retains road speed.
- Cars, a compact van, improved three-wheeled tuk-tuks and travel-driven wheel rotation.
- Original obstacle models remain matched to the Phase 1 collision dimensions and fair spawn patterns.

### Scooter boost and speed-scaled difficulty

- An original scooter pickup appears on a reachable route. The schoolboy visibly sits on it, holds the handlebars and turns its wheels with travelled distance.
- The boost is a literal **10× world/traffic speed multiplier for 10 game seconds**, with a live countdown and 10× HUD.
- A temporary traffic shield clears contacted obstacles only during the boost; ordinary collisions still end the run. Swept pickup and traffic colliders cover high-speed travel.
- The boost timer freezes on pause and clears on crash, restart or menu return. Another pickup cannot create unlimited overlapping boosts.
- Higher cruise-speed tiers replace empty/single rows with denser two-lane rows and more oncoming buses. Every generated row retains a survivable route, adjacent free-lane choices and at least 0.95 seconds of closing-speed spacing.

### Presentation and feedback

- A five-second black-and-white **Shaun David Studios** production ident with an original S/D monogram, scanlines, animated typography, timed progress and a readiness-based handoff.
- The intro remains until local fonts and the 3D game are ready, then exits cleanly; it is responsive and respects reduced-motion preferences.
- Smoothed third-person camera with restrained lane/jump following and a portrait-specific view.
- Smooth PBR shading, procedural sky/sun and soft clouds, generated image-based reflections, tuned soft shadows and restrained bloom on supported hardware. Mobile and software-GPU fallbacks avoid unsupported HDR work.
- Fixed-pool road dust, coin/shield/crash particles and scooter speed lines provide feedback without creating new meshes every frame.
- Polished title screen, HUD, district pill/banner, coin feedback, responsive scooter countdown, pause treatment, impact flash and game-over presentation.
- Original Web Audio synthesis for coins, scooter pickup, shield impacts, jumping, landing, sliding, collisions, buttons, ambient traffic and distant bus horns.
- Persistent mute preference, desktop keyboard input and mobile touch gestures.

### Endless performance design

- The original nine connected road centers and gap-free recycling math are preserved.
- Scenery uses seeded variants and changes only when sections recycle; queued rebuilds are limited to one per update.
- Unit primitive geometries, shared materials/textures and bounded label caches prevent resource growth from procedural variation.
- Compatible static and rigid-body meshes are batched with original colors preserved in vertex colors. Animated joints, wheels, signs and transparent effects remain independent.
- Recycled scenery and removed traffic explicitly dispose owned batch geometry without disposing shared primitives; the effects pools have fixed typed-array capacity.
- Obstacle spawning and decorative world generation remain separate.
- Pixel ratio is capped, with a lower cap for coarse-pointer/mobile devices. Sustained slow hardware can reduce resolution and then shed post-processing; actual software GPUs use a direct compatibility path.
- Gameplay uses bounded real-time frames divided into collision-safe substeps, so low rendering FPS does not arbitrarily stretch the 10-second boost or cruise-speed progression.

Scoring remains **10 points per metre + 100 points per coin**. Cruise speed rises from 14 to 36 world units/second; the temporary scooter multiplier applies on top of that cruise speed. Best score and mute preference use browser `localStorage`; blocked storage does not prevent play.

## Project structure

```text
index.html                     UI screens, HUD and accessibility labels
play-windows.bat               Windows web launcher
build-apk.bat                  Complete Windows Android APK builder
capacitor.config.json          Native app identity and splash configuration
android/                       Capacitor Android project and original native resources
scripts/render-mobile-assets.mjs  Cross-platform launcher/splash renderer
.github/workflows/android-apk.yml  Tested remote APK build and validation
src/main.js                    Font loading, native lifecycle and game bootstrap
src/mobile/MobilePlatform.js   Android Back, app-state and native splash handling
src/styles.css                 Responsive desktop/mobile interface
src/config.js                  Lane, physics and collider constants
src/art/MeshKit.js             Shared geometry, procedural surfaces and sign textures
src/art/StaticBatcher.js       Vertex-color static/rigid batching and owned disposal
src/art/Schoolboy.js           Original detailed articulated schoolboy
src/art/Scooter.js             Original rideable scooter and wheel assemblies
src/art/Policeman.js           Original uniformed Sri Lankan police officer
src/art/Vehicles.js            Original buses, cars, van, tuk-tuks and hazards
src/art/Environment.js         Themed buildings, plants, signs and street furniture
src/art/Landmarks.js           District landmarks, landscape strips and tunnels
src/game/Game.js               Game state, real-time substeps and single animation loop
src/game/GraphicsPipeline.js   Atmosphere, reflections, bloom and adaptive quality
src/game/VisualEffects.js      Fixed-pool particles and scooter speed lines
src/game/Player.js             Movement and articulated animation
src/game/PoliceChase.js        Non-catching pursuit, hazard response and safe gap
src/game/CameraRig.js          Smoothed desktop/portrait camera
src/game/AudioManager.js       Gesture-unlocked synthesized audio
src/game/WorldGenerator.js     Road recycling and seeded themed scenery
src/game/EnvironmentThemes.js  Pure district schedule and theme definitions
src/game/ObstacleSpawner.js    Traffic, coin/scooter lifecycle, swept collisions and shield contact
src/game/PatternPlanner.js     Fair speed-tier gameplay-row generation
src/game/InputController.js    Keyboard and touch gestures
src/game/ScoreManager.js       Score and persistent best record
src/ui/GameUI.js               HUD, menus, district and feedback presentation
src/ui/SignFonts.js            Local Sinhala/Tamil font loading and fallback
assets/icon.svg               Original game icon
tests/                        Gameplay, environment, character and browser regressions
```

## Verification

Run the production build and all Node tests:

```bash
npm test
npm run build
```

The suite retains the original physics, scoring, collision and persistence assertions and adds longer district scheduling, all landmark builders, consecutive tunnels, bounded geometry across repeated district cycles, speed-tier fairness, touch gestures, lazy audio, travel-driven wheels, absence of the schoolboy gestures, scooter pickup/duration/reset/shield behavior, literal 10× speed, police sprint/separation/return behavior, vertex-color batch/disposal, fixed effect pools, software-GPU detection, Android Back behavior and duplicate-listener prevention.

The optional real Chromium/WebGL suite starts its own Vite server:

```bash
npm install --no-save --package-lock=false puppeteer-core@25.15.0 @sparticuz/chromium@153.0.0
npm run test:browser
```

It checks the five-second studio intro and desktop/mobile wordmark bounds, startup with no idle officer, audio unlock/mute, keyboard, real dispatched touch gestures and on-screen mobile buttons, regular and oncoming traffic, detailed police pursuit and pointing, coin pickup without an arm gesture, live scooter pickup and exact 10× speed, shield contact, natural expiry and police return, jump/slide collision behavior, game over, pause/resume, clean restart, saved best score, road/ground ordering, every district and both tunnel runs, real Sinhala sign meshes and local fonts, portrait mobile/HUD layout, a batched-scene draw-call ceiling, and 7,200 metres of themed recycling with stable scene/GPU resource counts. Screenshots are written to the ignored `test-results/` directory.

To use an installed Chrome/Chromium instead of the optional package, set `CHROME_PATH` to its executable. For a deliberate visual check of the full HDR pipeline on a software renderer, append `?quality=high` to the development URL; normal automatic quality selection is recommended for play. The resource stress test and software-WebGL screenshots are not hardware-specific GTX 1660 Super or physical-mobile frame-rate benchmarks. Native APK compilation/package validation is separate from physical-device audio, lifecycle and FPS validation.
