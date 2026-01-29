# snowfall
_a quiet, generative web instrument_

a lofi, web-native homage inspired by the **monome norns** script *fall*.  
this is not a port. it is a reinterpretation.

See repo: https://github.com/ambalek/fall

---

## intent

build a small, focused generative audiovisual system that feels:

- calm
- slow
- tactile
- slightly mysterious
- musical first, visual second

something you open, start, and let run.  
an instrument you *listen to*, not a thing you operate.

---

## conceptual frame

**visual metaphor**  
snow falling. drifting. accumulating. melting.

**musical metaphor**  
each flake participates in the music.  
not every flake is a note.  
not every note is obvious.

motion → sound  
density → harmony  
time → evolution

---

## platform

- web browser only
- desktop first, mobile acceptable
- no native apps
- no hardware assumptions

audio must start only after user interaction (browser constraints apply).

---

## boundaries

- inspired by *fall*, not a clone
- do not replicate norns UI, layout, or parameter names
- reinterpret ideas, not implementation
- avoid “DAW energy”

---

## core systems (what, not how)

### visual system

- a field of snowflakes
- flakes have individual properties:
  - position
  - velocity
  - size
  - lifespan
  - drift / wind influence
- motion should feel organic, not grid-based
- visuals and sound must feel coupled

> rendering approach is open.

---

### musical system

- snowflakes influence musical events
- music should be:
  - tonal or modal
  - slow to mid-tempo
  - ambient / melodic / textural
- randomness should feel *bounded*

possible (non-prescriptive) mappings:
- pitch selection
- rhythm density
- envelope shape
- filter or fx modulation
- spatialization

> synthesis approach is open.

---

### interaction model

- minimal controls
- gentle influence, not performance

user should be able to:
- start / stop audio
- nudge the system (density, drift, mood)
- re-seed or regenerate behavior

interactions should feel like:
> adjusting weather, not playing notes

---

### time & evolution

- system evolves continuously
- no hard resets unless explicitly triggered
- supports long listening sessions
- subtle variation over time
- occasional moments of surprise

---

## ux + aesthetic direction

- single primary scene preferred
- controls should be:
  - sparse
  - understated
  - readable but not dominant
- visual tone:
  - muted
  - low contrast
  - soft motion
- geist + geist mono typeface
- dark / light mode toggles
- minimal sidebar for controlling parameters, keyboard shortcut to minimize all ui to let the animation shine

avoid:
- dashboards
- heavy chrome
- verbose labels
- instructional UI

---

## technical expectations (non-prescriptive)

- web audio–based sound generation
- audio scheduling should be stable and intentional
- visuals do not need frame-perfect sync
- reasonable performance on modern browsers
- graceful degradation on lower-power devices

libraries, frameworks, and architecture are intentionally unspecified.

---

## non-goals

- full norns parity
- hardware grid support (v1)
- multiplayer or collaboration
- preset libraries or session saving (optional, not required)

---

## success criteria

the project is successful if:

- a user can open it, start audio, and feel oriented within ~30 seconds
- leaving it running for 5–10 minutes remains musically interesting
- the relationship between motion and sound feels intuitive
- it feels like an *instrument*, not a demo

---

## open space for solutioning

the following are intentionally left open:

- how flakes map to musical structure
- how timing and scheduling are handled
- synthesis or sound sources
- how interaction is surfaced without clutter
- what constitutes the MVP vs future expansion
- primary risks and tradeoffs

---

_next step:_  
agent to propose a concrete plan addressing the above, including architecture, MVP scope, and key decisions.
