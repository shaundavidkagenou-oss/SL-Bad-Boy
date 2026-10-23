# SL BAD BOY — Schoolboy Rush

An original 3D Sri Lankan endless runner for **web and Android**, built with **Three.js, JavaScript, Vite and Capacitor**. It includes fourteen long themed districts, original approach and main landmark scenery, hill-country tunnels, ten purchasable articulated runners, rare mango-juice revives, a Sri Lankan police pursuit, a 10-second 1.2× scooter boost, fair speed-scaled traffic, direct swipe gestures and synthesized audio. Models, textures, signs and sounds are generated locally; the Android launcher and native splash use the supplied SL BAD BOY poster artwork. No branded game assets, CDN scripts or copyrighted Subway Surfers content are used.

## Android APK

**Package:** `lk.shaun.slbadboy` · **App name:** `SL BAD BOY` · **Minimum:** Android 7.0 (API 24) · **Target:** API 36.

- Direct branch download: **[artifacts/SL-BAD-BOY.apk](artifacts/SL-BAD-BOY.apk)** (produced and validated by the Android workflow).
- GitHub Actions also publishes the same package as the **SL-BAD-BOY-APK** workflow artifact with a SHA-256 checksum.
- The supplied APK is **debug-signed for direct installation/testing**, not signed for Play Store release. Android may ask you to allow installation from your browser/file manager.
- The complete game, fonts and procedural artwork are bundled inside the APK. Gameplay does not require a server or network connection.

### One-click Windows APK build

Install these prerequisites once:

1. **Node.js 22+**.
2. **Java 21** (available through Android Studio or a JDK) with `java` on PATH or `JAVA_HOME` set. Capacitor 8 cannot compile with Java 17.
3. **Android Studio/SDK** with Android SDK 36 and build tools, with `ANDROID_HOME`/`ANDROID_SDK_ROOT` set or `android/local.properties` configured by Android Studio.

Then double-click **`build-apk.bat`**. It installs exact Node dependencies when needed, builds the full web game, renders the supplied launcher/splash artwork, syncs Capacitor, runs Gradle, checks the resulting file, and copies it to:

```text
artifacts\SL-BAD-BOY.apk
```

For Android Studio development, use `npm run android:sync`, then `npm run android:open`. `npm run assets:android` regenerates only the native artwork. Do not edit `android/app/src/main/assets/public/` manually; it is generated from `dist/` by Capacitor.

### Automated APK build

`.github/workflows/android-apk.yml` runs on this branch and through **Run workflow**. It uses Node 22 and Java 21, runs the logic tests and production build, compiles the APK, checks the ZIP structure and offline game files, verifies package name/app label/version/minimum SDK with `aapt`, compares all supplied launcher/splash resources byte-for-byte, uploads the artifact, and commits the verified APK/checksum back to the branch.

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
| Android Back | Pause/resume; close shop; end a pending revive; game over returns to menu; menu exits |

Menus and the HUD pause button are clickable. The sound button toggles mute and remembers the preference; the pause screen also has independent music and sound-effects volume sliders. Audio is initialized only after user interaction to comply with browser autoplay rules. Android app backgrounding pauses an active run. The HUD, menus, loader and controls account for portrait/landscape layouts and display safe areas.

## Game features

### Sri Lankan world

- Fourteen naturally transitioning **1,080 m districts** (about one minute at the 18 m/s reference cruise): Colombo, Maharagama, Pettah, Kotte, Kandy, Kadugannawa, Nuwara Eliya, Ella, Galle, Negombo, Anuradhapura, Polonnaruwa, Jaffna and Trincomalee.
- Original procedural landmarks including a visible **Colombo Fort approach**, Galle Face, a large standalone Colombo Lotus Tower, Pettah Red Mosque/clock tower, Diyawanna parliament, Kandy temple/lake, Galle lighthouse, Nine Arches Bridge, tea country, railway scenery and Negombo lagoon. Anuradhapura and Polonnaruwa add distinct stupas/ancient pillars, Jaffna adds its fort/library and palmyrah landscape, and Trincomalee adds its harbor and Koneswaram hill temple.
- A two-section transition tunnel at every city boundary, with a next-city portal sign, interior strip lights and camera-safe roof clearance; Kadugannawa and Ella retain their additional hill-country tunnel runs.
- Detailed commercial buildings with district-specific palettes, shopfronts, shutters, balconies, side windows, awnings, rooftop tanks, rounded walls, drainpipes, AC units/fans, door hardware, planter boxes and varied proportions.
- Residential houses, tiled roofs, verandas, boundary walls, gates and gardens.
- Market stalls with striped awnings, crates and procedural produce.
- Curved coconut and palmyrah palms with individual fronds, broad-leaf banana plants and restrained crown sway, with each animated crown batched to one draw. Branched tropical trees retain twelve smooth textured canopy clusters alongside filled rear roadsides, shaped hill/forest terrain, local advertising, bus shelters, pavements, drains, utility poles and continuous overhead wires.
- Decorative junctions, traffic lights, parked cars/vans/tuk-tuks, street bins, district welcome gateways and black-and-white road-edge posts. District-specific distant skylines include hills, tea shapes, water horizons, towers and stupas.
- Kandy and the hill country add raised hillsides on both sides and close atmospheric fog. Anuradhapura uses a hot amber atmosphere, forest on both sides and detailed animated elephants with moving trunks, ears, heads, legs and tails. Colombo adds fair same-direction traffic density without removing the guaranteed free lane.
- King-coconut carts, Buddhist-flag rows, Ceylon tea chests, fishing-net racks, temple flower offerings and palmyrah produce baskets add roadside detail outside gameplay lanes.
- Sinhala roadside boards throughout ordinary road sections, plus district-matched shopfronts, road names, school-zone signs and bus destinations.
- Selected signs use correct Sinhala, Tamil and English text with locally bundled Noto fonts and an English fallback.
- Procedural asphalt, grass, paving, plaster, roof-tile and water materials with local color/height textures, subtle repaired tar seams, cast manholes and raised road studs, plus atmospheric color transitions and district announcements.

### Character and traffic

- Detailed organic schoolboy with a smooth torso/head, four continuous weighted skinned limb meshes, connected shoulders, elbows, wrists, hips, knees and ankles, plus layered hair, rounded clothing, uniform, backpack, socks and shoes.
- Continuous running/control animation with foot roll, head movement, backpack bounce, jump tuck, landing compression, lean-back slide, lane-change lean and collision stumble. The former menu wave and coin arm celebration are intentionally removed.
- Original Sri Lankan police officer in a khaki uniform, navy peaked cap, belt and boots, with detailed facial features, fingers, collar, seams, pockets, pouches, radio, boot laces and Sinhala/English back patch.
- Pelvis/torso counter-motion, heel-to-toe movement, baton follow-through, a pursuit point, split-leg hurdles, landing compression, braced slides and a catch-breath stop reaction.
- The officer joins the schoolboy in a non-catching menu showcase, sprints in when the run starts, follows at the player's shoulder and reacts to road hazards. He never catches the player or causes a collision; a scooter boost lets him fall far behind before he returns.
- Red-and-white public buses and four colourful private-bus palettes with windshields, doors, warm illuminated windows, trim, mirrors and destination boards. Evening headlamps use emissive geometry plus one capped instanced road-glow draw on hardware, never per-bus point/spot lights; software rendering skips the extra glow pass.
- Normal planner traffic retains road speed for predictable three-lane decisions. Faster approaching buses are reserved for explicit isolated flow/collision tests, where predictive same-lane braking, safe separation and swept collision coverage also apply at low FPS.
- Cars, a compact van, improved three-wheeled tuk-tuks and travel-driven wheel rotation.
- Original obstacle models remain matched to the Phase 1 collision dimensions and fair spawn patterns.

### Character shop and rare juice revives

- A working shop offers **ten original playable runners**: the free SL Schoolboy plus Colombo Scout, Kandy Runner, Coastal Sprinter, Tea Country Trekker, Jaffna Rider, City Explorer, Harbour Captain, Night Route Ace and Island Legend. Outfits, hair, caps, glasses, wristbands and packs differ while all retain the continuous four-limb animation rig.
- Run coins become spendable shop currency. Characters are bought once, ownership/selection and the wallet persist locally, and coins earned before the shop existed migrate once. Buying or selecting immediately replaces the live model; old skinned GPU buffers are released and only one runner rig remains in the scene.
- Shop portraits are transparent local renders of the actual procedural 3D rigs, not copyrighted character artwork. They load only when the shop is used; `npm run assets:runners` regenerates them with the optional Chromium tooling.
- A rare original **mango juice packet** appears on the second, fourth, sixth and subsequent even district transitions. It uses a planner-approved free lane and never replaces traffic fairness with an unavoidable pickup row.
- Juice inventory persists and is capped at **three packets**. A packet touched with a full inventory remains in the world instead of being silently consumed.
- A collision with at least one packet opens a real revive choice. Drinking one packet preserves the current score, distance and coins, clears nearby fatal traffic and respawns the selected runner with **three seconds of collision protection**. The player can instead end the run; without a packet, collision follows the normal game-over flow.

### Scooter boost and speed-scaled difficulty

- An original scooter pickup appears on a reachable route. The schoolboy visibly sits on it, holds the handlebars and turns its wheels with travelled distance.
- The boost is a literal **1.2× world/traffic speed multiplier for 10 game seconds**, with a live countdown and 1.2× HUD.
- A temporary traffic shield clears contacted obstacles only during the boost; ordinary collisions still end the run. Swept pickup and traffic colliders cover high-speed travel.
- The boost timer freezes on pause and clears on crash, restart or menu return. Another pickup cannot create unlimited overlapping boosts.
- Higher cruise-speed tiers replace empty/single rows with denser two-lane pressure without silently increasing vehicle closing speed. Every generated row retains a survivable route, adjacent free-lane choices and at least 0.95 seconds of spacing.

### Near misses and island progression

- A real vehicle near miss requires a swept crossing with 0–0.8 m of lateral clearance beyond both colliders. It awards **250 points once per vehicle**; ordinary adjacent-lane passes do not qualify, and collision handling always takes priority.
- Every 500 m milestone has a compact HUD and original audio cue. Near misses add restrained pooled particles and bounded camera feedback without changing traffic fairness.
- Three deterministic local-day missions track distance, coins and close calls across completed runs. Completed missions award non-spendable **Island Stars** once, advance rank progress and preserve lifetime totals.
- Daily rollover works on reload or while the app remains open, preserving stars and lifetime totals. Progress is local/offline; there are no fake purchases, currencies or decorative menu controls.

### Presentation and feedback

- A five-second black-and-white **Shaun David Studios** production ident with an original S/D monogram, scanlines, animated typography, timed progress and a readiness-based handoff.
- The intro remains until local fonts and the 3D game are ready, then exits cleanly; it is responsive and respects reduced-motion preferences.
- Smoothed third-person camera with restrained lane/jump following, bounded speed/scooter FOV, impact impulses and a portrait-specific view. Feedback and camera transforms reset cleanly on restart/menu return.
- Smooth PBR shading, cached district-specific evening palettes, a low warm sun, procedural sunset sky/clouds and a generated dusk reflection environment, plus one pooled instanced draw for soft character/vehicle contact grounding. **Real-time shadow maps and mesh/light shadow flags remain disabled.** Hardware mobile keeps road-only height detail. HDR/bloom is reserved for supported desktop hardware, while mobile and software GPUs render directly.
- Crested lotus-sun coin trails retain their shared vertex-colored geometry and render through one dynamic instanced draw capped at 96 coins. Fixed-pool road dust, coin/near-miss/shield/crash particles and scooter speed lines provide feedback without creating new meshes every frame.
- An original character-led evening title screen with a close drifting camera, prominent Play action and expandable daily goals; compact notch-safe HUD, district pill/banner, milestone and near-miss feedback, responsive scooter countdown, pause audio settings, impact flash and game-over reward presentation.
- Original Web Audio pentatonic music and synthesis for footsteps, lane movement, coins, near misses, milestones, scooter pickup, shield impacts, jumping, landing, sliding, collisions, buttons, ambient traffic and distant bus horns.
- Persistent mute and independent music/SFX volumes, desktop keyboard input and mobile touch gestures.

### Endless performance design

- The original nine connected road centers and gap-free recycling math are preserved. Mobile visibility culling only hides distant scenery draws; it never deletes landmarks, road sections or recycling data.
- Scenery uses seeded variants and changes only when sections recycle; queued rebuilds are limited to one per update.
- Unit primitive geometries, shared materials/textures and bounded label caches prevent resource growth from procedural variation.
- Compatible static and rigid-body meshes are batched with original colors preserved in vertex colors. UVs are discarded only when no UV-dependent texture uses them; mapped surfaces retain their coordinates. Static world/backdrop matrices are frozen, while each swaying crown remains one draw and animated joints, wheels, signs and transparent effects remain independent.
- Recycled scenery and removed traffic explicitly dispose owned batch geometry without disposing shared primitives; the effects pools have fixed typed-array capacity.
- Obstacle spawning and decorative world generation remain separate.
- Pixel ratio is capped at **1.25 on hardware mobile**, **1.4 on hardware desktop** and **0.75 on software GPUs**. Coarse-pointer mobile uses direct rendering without MSAA, bump mapping or HDR/bloom; its performance mode hides cloud sprites and extra road glow, culls far scenery to 135 m and throttles vegetation/elephant poses to 20 Hz while movement remains frame-rate independent. Hardware mobile retains a one-time generated reflection environment initially, but sustained slow frames can reduce resolution and release it. Desktop retains the richer atmosphere; software GPUs use no MSAA, reflections or bump mapping. HUD DOM writes are rate-limited.
- Gameplay uses bounded real-time frames divided into collision-safe substeps, so low rendering FPS does not arbitrarily stretch the 10-second boost or cruise-speed progression.

Scoring is **10 points per metre + 100 points per coin + 250 points per valid near miss**. Cruise speed rises from 14 to 36 world units/second; the temporary scooter multiplier applies on top of that cruise speed. Best score, mute/volume preferences, island progression, shop ownership/wallet/selection and juice inventory use browser `localStorage`; blocked storage does not prevent play.

## Project structure

```text
index.html                     UI screens, HUD and accessibility labels
play-windows.bat               Windows web launcher
build-apk.bat                  Complete Windows Android APK builder
capacitor.config.json          Native app identity and splash configuration
android/                       Capacitor Android project and native resources
scripts/render-mobile-assets.mjs  Cross-platform launcher/splash renderer
scripts/render-runner-previews.mjs Actual-rig transparent shop portrait renderer
.github/workflows/android-apk.yml  Tested remote APK build and validation
src/main.js                    Font loading, native lifecycle and game bootstrap
src/mobile/MobilePlatform.js   Android Back, app-state and native splash handling
src/styles.css                 Responsive desktop/mobile interface
src/ui/polish.css              Compact missions, rewards, feedback and volume styling
src/config.js                  Lane, physics and collider constants
src/art/MeshKit.js             Shared geometry, procedural surfaces and sign textures
src/art/StaticBatcher.js       Vertex-color static/rigid batching and owned disposal
src/art/Schoolboy.js           Original continuous-skinned articulated runner variants
src/art/JuicePacket.js         Original mango-juice revive pickup
src/art/Scooter.js             Original rideable scooter and wheel assemblies
src/art/Policeman.js           Original uniformed Sri Lankan police officer
src/art/Vehicles.js            Original buses, cars, van, tuk-tuks and hazards
src/art/Environment.js         Themed buildings, signs and street furniture
src/art/Vegetation.js           Layered organic trees, coconut/palmyrah palms and banana plants
src/art/DistrictDetail.js       Filled roadside terrain, rear buildings and forest placement
src/art/Elephant.js             Detailed articulated elephant and continuous animation
src/art/Roadside.js             Sri Lankan carts, offerings, flags and district gateways
src/art/DistrictBackdrop.js     District-specific distant skylines and landscapes
src/art/Landmarks.js           District landmarks, landscape strips and tunnels
src/art/MoreLandmarks.js        Fort, ancient-city, Jaffna and Trincomalee detail
src/game/Game.js               Game state, real-time substeps and single animation loop
src/game/GraphicsPipeline.js   Sunset atmosphere, reflections, bloom and adaptive quality
src/game/Evening.js            Cached district-specific dusk palettes
src/game/RoadLightPools.js     Capped one-draw hardware bus road glow
src/game/VisualEffects.js      Fixed-pool particles and scooter speed lines
src/game/ContactShadows.js     Pooled one-draw soft contact grounding
src/game/ProgressionManager.js Local-day missions, stars, ranks and lifetime totals
src/game/CharacterCatalog.js   Ten original runner definitions and prices
src/game/ShopManager.js        Persistent wallet, ownership and selection
src/game/JuiceInventory.js     Persistent capped revive inventory
src/game/Player.js             Movement, model switching, respawn and articulated animation
src/game/PoliceChase.js        Non-catching pursuit, hazard response and safe gap
src/game/CameraRig.js          Smoothed desktop/portrait camera
src/game/AudioManager.js       Gesture-unlocked synthesized audio
src/game/WorldGenerator.js     Road recycling and seeded themed scenery
src/game/EnvironmentThemes.js  Pure district schedule and theme definitions
src/game/ObstacleSpawner.js    Fair traffic, coins, scooter/juice pickups and swept collisions
src/game/PatternPlanner.js     Fair speed-tier gameplay-row generation
src/game/InputController.js    Keyboard and touch gestures
src/game/ScoreManager.js       Score and persistent best record
src/ui/GameUI.js               HUD, menus, district and feedback presentation
src/ui/SignFonts.js            Local Sinhala/Tamil font loading and fallback
assets/icon.svg               Original web game icon
assets/sl-bad-boy-logo.jpg     Supplied Android launcher and native splash artwork
tests/                        Gameplay, environment, character and browser regressions
```

## Verification

Run the production build and all Node tests:

```bash
npm test
npm run build
```

Current 2.6.0 source verification: **68/68 Node tests**, **30/30 Chromium checks** and a **75-module production build** passed. In the same live 390×844 software-WebGL mobile scene, the full-detail comparison rendered **440 calls / 222,492 triangles**, while mobile culling rendered **346 calls / 161,536 triangles**—about **21% fewer calls** and **27% fewer triangles**. The browser run also verified real purchase/equip behavior, all ten portrait assets, live juice pickup, death/revive/score preservation, safety shielding, clean restarts, all fourteen districts and stable resources over 7,200 metres. These are rendering-cost diagnostics, **not physical-device FPS measurements**.

The suite retains the original physics, scoring, collision and persistence assertions and adds longer district scheduling, all landmark builders, consecutive tunnels, bounded geometry across repeated district cycles, speed-tier fairness, predictive bus separation at normal and low FPS, touch gestures without bottom buttons, continuous skin deformation, animated elephants, lazy audio, travel-driven wheels, absence of the schoolboy gestures, scooter pickup/duration/reset/shield behavior, literal 1.2× speed, police sprint/separation/return behavior, vertex-color batch/disposal, fixed effect pools, software-GPU detection, Android Back behavior and duplicate-listener prevention, plus crested one-mesh coins, pooled contact shadows, true near-miss clearance/scoring, clean camera resets, live daily rollover, independent audio levels, UV-safe batching and one-draw animated crowns.

The optional real Chromium/WebGL suite starts its own Vite server:

```bash
npm install --no-save --package-lock=false puppeteer-core@25.15.0 @sparticuz/chromium@153.0.0
npm run test:browser
```

It checks the five-second studio intro and desktop/mobile wordmark bounds, the visible but non-chasing menu officer, gameplay portrait-FOV restoration, audio unlock/mute, keyboard, real dispatched touch gestures with no bottom direction buttons, regular and oncoming traffic, detailed police pursuit and pointing, coin pickup without an arm gesture, live scooter pickup and exact 1.2× speed, shield contact, natural expiry and police return, jump/slide collision behavior, game over, pause/resume, clean restart, saved best score, road/ground ordering, every district and city-transition tunnels, real Sinhala sign meshes and local fonts, portrait mobile/HUD/shop/revive layout, real character purchase/equip and juice-revive flows, same-scene mobile culling reductions, a batched-scene draw-call ceiling, and 7,200 metres of themed recycling with stable scene/GPU resource counts. Screenshots are written to the ignored `test-results/` directory.

To use an installed Chrome/Chromium instead of the optional package, set `CHROME_PATH` to its executable. The resource stress test and software-WebGL screenshots are not hardware-specific GTX 1660 Super or physical-mobile frame-rate benchmarks. Native APK compilation/package validation is separate from physical-device audio, lifecycle and FPS validation.
