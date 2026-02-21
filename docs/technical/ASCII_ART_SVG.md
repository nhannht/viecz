# Image to Colored ASCII Art SVG

**Last Updated:** 2026-02-20

Pipeline for converting a PNG/image mascot into a colored ASCII art SVG suitable for web embedding with canvas glitch effects.

---

## Pipeline Overview

```
PNG (with alpha) ──► ImageMagick trim ──► image2ascii (Go CLI) ──► ASCII .txt
                                                                       │
PNG (RGBA original) ─────────────────────────────────────────► Python ascii2svg.py
                                                                       │
                                                                  Colored SVG
                                                                       │
                                                              HTML <img> + <canvas>
                                                              (glitch/scanline effects)
```

**Key insight**: Two images are used — a white-flattened version for ASCII shape generation, and the original RGBA image for color sampling. This preserves vibrant colors while getting accurate character density from `image2ascii`.

---

## Prerequisites

| Tool | Install | Purpose |
|------|---------|---------|
| `image2ascii` | `go install github.com/qeesung/image2ascii@latest` | PNG → ASCII text |
| ImageMagick | `apt install imagemagick` | Trim, flatten transparency |
| Python 3 + Pillow | `pip install Pillow` | Color-sample + generate SVG |

---

## Step 1: Prepare the Image

Trim transparent padding and create a white-background version for ASCII conversion:

```bash
# Trim transparency + flatten to white background
convert mascot-512.png -trim +repage mascot-trimmed.png
convert mascot-512.png -trim +repage -background white -flatten mascot-white.png
```

**Why flatten?** `image2ascii` maps pixel brightness to characters. Transparent pixels (alpha=0) map to spaces regardless of RGB, producing empty output. White background gives proper brightness contrast.

---

## Step 2: Generate ASCII Art

```bash
image2ascii -f mascot-white.png -w 80 -g 50 -i -c=false > mascot-ascii.txt
```

### Flags

| Flag | Value | Purpose |
|------|-------|---------|
| `-f` | file path | Input image |
| `-w` | `80` | Output width in characters (controls detail level) |
| `-g` | `50` | Output height in characters (aspect ratio control) |
| `-i` | (flag) | Invert brightness mapping — required for white backgrounds |
| `-c=false` | (flag) | Disable ANSI color codes — we only want raw characters |

### Tuning Tips

- **More detail**: Increase `-w` (100-120) — produces larger SVG
- **Less detail**: Decrease `-w` (40-60) — faster render, smaller file
- **Aspect ratio**: Adjust `-g` relative to `-w`. Characters are ~2x taller than wide, so `-g` ≈ `-w * 0.6` is a good starting point
- **Inverted (`-i`)**: Use when source has light background. Skip for dark backgrounds
- **Too tall?** ASCII characters are taller than wide. Use `-g` to constrain height explicitly

---

## Step 3: Generate Colored SVG

Python script (`ascii2svg.py`) reads the ASCII text + original RGBA image, samples colors per character, and outputs an SVG with `<text>` elements.

### Script: `ascii2svg.py`

```python
#!/usr/bin/env python3
"""Convert mascot image to colored ASCII art SVG with vibrant colors."""
from PIL import Image

# Config
ORIG_PATH = "mascot-512.png"        # Original RGBA image (for color sampling)
ASCII_PATH = "mascot-ascii.txt"     # ASCII art from image2ascii
SVG_PATH = "mascot-ascii.svg"       # Output SVG
CHAR_W = 7.2                        # Monospace character width in px
CHAR_H = 12                         # Monospace character height in px
ALPHA_THRESHOLD = 30                # Min alpha to render a character

# Load ASCII art
with open(ASCII_PATH) as f:
    lines = [line.rstrip('\n') for line in f.readlines()]

rows = len(lines)
cols = max(len(line) for line in lines) if lines else 0

# Load ORIGINAL image (with alpha) trimmed to match ASCII grid
img = Image.open(ORIG_PATH).convert("RGBA")
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

img_resized = img.resize((cols, rows), Image.LANCZOS)

# Build SVG
svg_w = cols * CHAR_W + 20
svg_h = rows * CHAR_H + 20

parts = []
parts.append(f'<svg id="mascotSvg" xmlns="http://www.w3.org/2000/svg" '
             f'viewBox="0 0 {svg_w:.0f} {svg_h:.0f}">')
parts.append(f'<style>text {{ font-family: "Space Mono", "Courier New", monospace; '
             f'font-size: {CHAR_H}px; dominant-baseline: text-before-edge; }}</style>')

for row_idx, line in enumerate(lines):
    y = 10 + row_idx * CHAR_H
    run_start = 0
    run_color = None
    run_chars = []

    def flush_run():
        if not run_chars:
            return
        text = ''.join(run_chars)
        text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        x = 10 + run_start * CHAR_W
        parts.append(f'<text x="{x:.1f}" y="{y}" fill="{run_color}" '
                     f'xml:space="preserve">{text}</text>')

    for col_idx, ch in enumerate(line):
        if ch == ' ':
            flush_run()
            run_chars = []
            run_start = col_idx + 1
            run_color = None
            continue

        # Sample RGBA from original image
        if col_idx < img_resized.width and row_idx < img_resized.height:
            r, g, b, a = img_resized.getpixel((col_idx, row_idx))
        else:
            r, g, b, a = 100, 100, 100, 0

        # Skip transparent areas
        if a < ALPHA_THRESHOLD:
            flush_run()
            run_chars = []
            run_start = col_idx + 1
            run_color = None
            continue

        # Boost saturation for more vibrant colors
        gray = (r + g + b) // 3
        boost = 1.4
        r = max(0, min(255, int(gray + (r - gray) * boost)))
        g = max(0, min(255, int(gray + (g - gray) * boost)))
        b = max(0, min(255, int(gray + (b - gray) * boost)))

        color = f'#{r:02x}{g:02x}{b:02x}'
        if color != run_color:
            flush_run()
            run_chars = [ch]
            run_start = col_idx
            run_color = color
        else:
            run_chars.append(ch)

    flush_run()

parts.append('</svg>')

with open(SVG_PATH, 'w') as f:
    f.write('\n'.join(parts))

print(f"Generated {SVG_PATH}: {cols}x{rows} chars, {svg_w:.0f}x{svg_h:.0f}px")
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Color from RGBA original, not white-flattened** | White-flattened image washes out colors — all pixels blend toward white |
| **Alpha threshold (30)** | Skips near-transparent pixels so background doesn't render as noise characters |
| **Saturation boost (1.4x)** | ASCII characters are thin — colors appear muted at small sizes. Boosting saturation compensates |
| **Run-length grouping** | Consecutive same-color characters become one `<text>` element, reducing SVG size ~3x |
| **`xml:space="preserve"`** | Ensures browsers don't collapse whitespace within text runs |
| **10px padding** | Prevents clipping at SVG edges |

### Tunable Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| `CHAR_W` | 7.2 | Horizontal spacing — match your CSS font-size |
| `CHAR_H` | 12 | Vertical spacing / font-size |
| `ALPHA_THRESHOLD` | 30 | Higher = more aggressive transparency culling |
| `boost` | 1.4 | Saturation multiplier (1.0 = no change, 2.0 = very saturated) |

---

## Step 4: Embed in HTML with Canvas Glitch Effects

The SVG is loaded as an `<img>`, rasterized into an offscreen canvas, then rendered frame-by-frame with glitch/scanline effects.

### HTML Structure

```html
<div class="cat-wrapper">
  <!-- Hidden source SVG -->
  <img id="mascotImg" src="mascot-ascii.svg" alt="Mascot" style="display:none"/>
  <!-- Visible canvas with effects -->
  <canvas id="catCanvas" width="596" height="620"></canvas>
</div>
```

Set canvas `width`/`height` to match the SVG's `viewBox` dimensions (from `ascii2svg.py` output).

### JavaScript: Glitch/Scanline Render Loop

```javascript
const mascotImg = document.getElementById('mascotImg');
const canvas = document.getElementById('catCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Offscreen buffer holds the rasterized mascot
const offscreen = document.createElement('canvas');
offscreen.width = W;
offscreen.height = H;
const oCtx = offscreen.getContext('2d');
let imgReady = false;

function loadMascot() {
  if (mascotImg.complete && mascotImg.naturalWidth > 0) {
    oCtx.drawImage(mascotImg, 0, 0, W, H);
    imgReady = true;
    requestAnimationFrame(render);
  } else {
    mascotImg.onload = () => {
      oCtx.drawImage(mascotImg, 0, 0, W, H);
      imgReady = true;
      requestAnimationFrame(render);
    };
  }
}

// ─── GLITCH + SCANLINE + BREATHING RENDER LOOP ───
let time = 0;
let glitchIntensity = 0;
let nextGlitch = 60 + Math.random() * 120;

// Hover triggers a glitch burst
canvas.addEventListener('mouseenter', () => {
  glitchIntensity = 0.7 + Math.random() * 0.3;
});

function render() {
  time++;
  ctx.clearRect(0, 0, W, H);
  if (!imgReady) { requestAnimationFrame(render); return; }

  // Periodic glitch bursts (every 2-5 seconds)
  if (time >= nextGlitch) {
    glitchIntensity = 0.5 + Math.random() * 0.5;
    nextGlitch = time + 120 + Math.random() * 180;
  }
  if (glitchIntensity > 0) {
    glitchIntensity *= 0.93;  // Decay
    if (glitchIntensity < 0.02) glitchIntensity = 0;
  }

  // Breathing: gentle oscillation, top moves more, bottom anchored
  const breathAmp = Math.sin(time * 0.03) * 1.5;

  // Draw mascot in horizontal slices with glitch offset + breathing
  const sliceH = 3;
  for (let y = 0; y < H; y += sliceH) {
    let offsetX = 0;
    if (glitchIntensity > 0 && Math.random() < glitchIntensity * 0.3) {
      offsetX = (Math.random() - 0.5) * 60 * glitchIntensity;
    }
    offsetX += Math.sin(y * 0.02 + time * 0.025) * 1.2;  // Wave distortion
    const breathY = breathAmp * (1 - y / H);
    ctx.drawImage(offscreen, 0, y, W, sliceH, offsetX, y + breathY, W, sliceH);
  }

  // Scanlines
  ctx.fillStyle = 'rgba(240, 237, 232, 0.25)';
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1);
  }

  // Thick glitch bands during burst
  if (glitchIntensity > 0.1) {
    for (let i = 0; i < 4; i++) {
      const by = Math.random() * H;
      const bh = 2 + Math.random() * 6;
      ctx.fillStyle = `rgba(240, 237, 232, ${0.25 + glitchIntensity * 0.35})`;
      ctx.fillRect(0, by, W, bh);
    }
  }

  // Vignette
  const grad = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.75);
  grad.addColorStop(0, 'rgba(240,237,232,0)');
  grad.addColorStop(1, 'rgba(240,237,232,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  requestAnimationFrame(render);
}

loadMascot();
```

### Effect Parameters

| Effect | Parameter | Value | Tuning |
|--------|-----------|-------|--------|
| Glitch frequency | `nextGlitch` | 120-300 frames | Lower = more frequent |
| Glitch decay | `*= 0.93` | 0.93 | Lower = faster fade |
| Glitch displacement | `* 60` | 60px max | Higher = more dramatic |
| Breathing amplitude | `* 1.5` | 1.5px | Higher = more bounce |
| Breathing speed | `* 0.03` | 0.03 rad/frame | Higher = faster |
| Wave distortion | `* 1.2` | 1.2px | Higher = more wavy |
| Scanline opacity | `0.25` | 25% | Higher = more visible lines |
| Scanline spacing | `y += 4` | 4px | Lower = denser lines |
| Vignette strength | `0.4` | 40% edge opacity | Higher = stronger fade |

---

## Full Command Sequence (Quick Reference)

```bash
# 1. Install tools
go install github.com/qeesung/image2ascii@latest
pip install Pillow

# 2. Prepare image
convert input.png -trim +repage trimmed.png
convert input.png -trim +repage -background white -flatten white.png

# 3. Generate ASCII art
image2ascii -f white.png -w 80 -g 50 -i -c=false > ascii.txt

# 4. Generate colored SVG (edit paths in script first)
python3 ascii2svg.py
# Output: mascot-ascii.svg (80x50 chars, ~596x620px, ~146KB)
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| ASCII output is all spaces | Transparent background | Flatten to white: `-background white -flatten` |
| ASCII output is all `@` | Dark regions map to dense chars | Use `-i` (invert) flag |
| SVG colors washed out | Sampling from white-flattened image | Use original RGBA image for color, only white version for ASCII shape |
| SVG too large (>500KB) | Too many `<text>` elements | Reduce `-w` (fewer columns) or increase run-length grouping |
| Characters misaligned in browser | Font metrics mismatch | Use monospace font, match `CHAR_W`/`CHAR_H` to actual rendered size |
| Transparent areas show noise chars | Alpha threshold too low | Increase `ALPHA_THRESHOLD` (try 50-80) |
| ASCII art too tall | Default aspect ratio | Explicitly set `-g` (height) to control row count |

---

## Example Output

Input: 512x512 PNG mascot (green slug with graduation cap)
Settings: `-w 80 -g 50 -i`, saturation boost 1.4x
Output: 80x50 character grid, 596x620px SVG, 146KB

The resulting SVG uses `<text>` elements with per-character hex colors, rendered in "Space Mono" / "Courier New" monospace font. Combined with the canvas glitch pipeline, it creates a retro-terminal aesthetic with vibrant original colors preserved.
