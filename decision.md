# Decision: Cinematic "How it Works" Animation Upgrades

## Current State
Animations work but feel "PowerPoint-tier" — every element does the same opacity 0→1 + translateY 30→0 with identical easing. No visual variety, no sense of weight or depth.

## Problems Identified

### 1. No Choreography — Everything Moves the Same Way
Every element uses identical `cubic-bezier(0.22, 1, 0.36, 1)` and the same fade+slide pattern. Cinematic motion needs variety in the motion vocabulary.

### 2. No "Weight" — Elements Float In Like Ghosts
Real objects have mass. When something appears it should slightly overshoot then settle (elastic ease), have different speeds for different "weights" (a button is lighter than a card). The task card in Step 1 should feel like it drops into place, not fade in.

### 3. No Blur/Focus Pull
Cinema uses rack focus — things come into focus as they become the subject. We can do this with `filter: blur()` transitions. Currently we only animate opacity + transform.

### 4. Typewriter Is Mechanical
The `steps(20, end)` easing makes it feel like a fixed-speed teletype. Real typing has variable speed — fast on easy letters, slight pauses between words.

## Options

### Option A: Better Easing + Blur (low effort, big impact)
- Add `filter: blur(8px) → blur(0)` to mock panel entrances
- Use elastic overshoot on the task card and stamp (`scale(0.95) → scale(1.02) → scale(1)`)
- Stagger mock elements with micro-delays (30-50ms) instead of sequential awaits
- Text slides from reading direction, mocks scale up from depth

### Option B: Parallax Depth + Choreography (medium effort)
- Everything in Option A
- Text slides in from the left, mock slides in from the right (opposing directions = visual tension)
- Step 2 reversed: text from right, mock from left (matches the river layout direction)
- Progress bar in Step 3 gets a glow/pulse at completion
- Counter in Step 2 uses `tabular-nums` font feature + scale bump on each increment
- Different easing curves per element "weight" (light elements = snappy, heavy elements = smooth)

### Option C: Full Cinematic — Pinned Scroll + Camera Feel (high effort)
- Everything in A + B
- Pin the entire howitworks section while steps animate in sequence (scroll = progress, not position)
- Steps cross-dissolve (Step 1 fades out as Step 2 fades in, with 0.5s overlap)
- Subtle background gradient shift between steps (different teal tones)
- Receipt in Step 3 gets a paper texture noise overlay that fades in

## Technical Notes
- All animations use Web Animations API (WAA) for sequences, GSAP ScrollTrigger for viewport detection only
- GPU-only properties: `transform`, `opacity`, `filter` (blur). No `width`/`height` animations.
- `will-change` added before animation, removed in `.finished` handler
- `[attr.data-hiw]` binding syntax required inside `*transloco` structural directives (Angular strips bare `data-*` attrs)
- Dev route at `/dev/howitworks` for fast iteration without 3D whale reload

## Reference Techniques (from Stripe/Linear/Codrops research)
- Custom cubic-bezier curves instead of built-in easing (e.g., `0.45,0.05,0.55,0.95` for smooth acceleration)
- Micro-stagger: 30-50ms between elements (feels alive, not mechanical)
- Elastic overshoot: `elastic.out(1, 0.5)` for settling effect on heavy elements
- Layered parallax: different easing per layer creates depth illusion
- Shot overlap: animations overlap by 0.5-1s instead of starting/stopping sharply
