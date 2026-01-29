# snowfall — execution plan

**repo**: https://github.com/dvncvn/snowfall.git

---

## architecture decisions

| concern | decision | rationale |
|---------|----------|-----------|
| rendering | Canvas 2D | sufficient for soft particles, simpler than WebGL |
| synthesis | Web Audio API (native) | no external audio libs, full control |
| framework | vanilla TypeScript | minimal footprint, no framework overhead |
| build | Vite | fast HMR, simple config |
| state | simple reactive store | lightweight, no redux/zustand needed |
| styling | CSS variables + minimal CSS | easy theming, dark/light mode |

---

## MVP scope

phases 1–5 constitute MVP:
- working snowflake particle system
- generative audio triggered by flakes
- visual-audio coupling feels intuitive
- minimal controls (start/stop, density, drift, mood)
- collapsible sidebar UI

---

## execution order

### phase 1: foundation ✓

#### 1.1 project scaffolding
- [x] init git repo
- [x] `npm create vite@latest . -- --template vanilla-ts`
- [x] configure tsconfig (strict mode)
- [x] basic HTML structure (single canvas, sidebar container)
- [x] CSS reset, CSS variables for theming
- [x] Geist + Geist Mono font setup

#### 1.2 canvas setup
- [x] create canvas element, handle resize
- [x] basic requestAnimationFrame loop
- [x] delta-time tracking for frame-independent motion

---

### phase 2: visual system ✓

#### 2.1 snowflake particle system
- [x] `Snowflake` class/interface:
  - position (x, y)
  - velocity (vx, vy)
  - size
  - opacity
  - lifespan / age
  - drift factor
- [x] particle pool (spawn, update, recycle)
- [x] density control (flakes per second)

#### 2.2 organic motion
- [x] perlin/simplex noise for wind field
- [x] gentle horizontal drift
- [x] subtle size/opacity variation over lifetime
- [x] soft fade-in on spawn, fade-out on death

---

### phase 3: audio system ✓

#### 3.1 web audio foundation
- [x] `AudioEngine` class
- [x] user-gesture-gated AudioContext creation
- [x] master gain node
- [x] global reverb send (ConvolverNode or simple feedback delay)

#### 3.2 synthesis voices
- [x] simple voice: oscillator → filter → envelope → gain
- [x] voice pool (polyphony limit ~8-12)
- [x] attack/release envelope shaping
- [x] filter modulation for timbral variation

#### 3.3 musical logic
- [x] scale/mode system (e.g., pentatonic, dorian, lydian)
- [x] note selection from bounded pitch range
- [x] rhythm density control (events per minute)
- [x] occasional octave shifts, passing tones

---

### phase 4: integration ✓

#### 4.1 visual-audio coupling
- [x] flake events trigger note candidates
- [x] not every flake = note (probability gate)
- [x] mapping options:
  - y-position → pitch (higher = higher pitch, or inverse)
  - x-position → pan
  - size → velocity/volume
  - density → harmonic complexity

#### 4.2 evolution system
- [x] slow drift of parameters over time
- [x] mood shifts (scale changes every N minutes)
- [x] density ebbs and flows
- [x] occasional "quiet moments"

---

### phase 5: interaction & UI ✓

#### 5.1 minimal controls
- [x] play/pause button (large, obvious)
- [x] density slider
- [x] drift/wind slider
- [x] mood selector (or random)
- [x] re-seed button

#### 5.2 sidebar UI
- [x] collapsible sidebar (left or right)
- [x] keyboard shortcut to toggle (e.g., `h` for hide)
- [x] sparse labels, understated styling
- [x] dark/light mode toggle

#### 5.3 keyboard shortcuts
- [x] `space` — play/pause
- [x] `h` — hide/show UI
- [x] `r` — re-seed
- [x] `d` — toggle dark/light mode
- [x] `p` — toggle pixel mode (bonus)

---

### phase 6: polish

#### 6.1 aesthetics
- [ ] muted color palette (dark: near-black bg, soft white flakes)
- [ ] light mode variant
- [ ] Geist font integration verified
- [ ] subtle UI transitions

#### 6.2 performance
- [ ] particle count caps
- [ ] throttle audio events on low-power
- [ ] reduce motion preference support
- [ ] test on Safari, Firefox, Chrome

---

## file structure (proposed)

```
snowfall/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts              # entry point
│   ├── canvas.ts            # canvas setup, render loop
│   ├── snowflake.ts         # particle class + pool
│   ├── wind.ts              # noise-based wind field
│   ├── audio/
│   │   ├── engine.ts        # AudioContext, master chain
│   │   ├── voice.ts         # synth voice
│   │   └── music.ts         # scale, note selection, rhythm
│   ├── controls.ts          # UI bindings
│   ├── state.ts             # reactive store
│   └── utils.ts             # helpers (lerp, clamp, noise)
├── styles/
│   └── main.css
└── public/
    └── fonts/               # Geist if self-hosted
```

---

## risks & mitigations

| risk | mitigation |
|------|------------|
| audio glitches / clicks | proper envelope release, voice stealing |
| performance on low-end | cap particles, throttle audio rate |
| browser audio policies | clear "click to start" UX |
| monotony over time | evolution system, mood shifts |

---

## success checklist

- [ ] user oriented within 30 seconds
- [ ] 5–10 min session remains interesting
- [ ] motion-sound relationship feels intuitive
- [ ] feels like an instrument, not a demo

---

_ready for execution_
