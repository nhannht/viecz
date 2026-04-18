# Report Page Enhancements

7 creative features to add to `web/src/app/report/`:

1. **Animated Counter for Stats** — `.stat` numbers count up from 0 when scrolled into view (IntersectionObserver). Ranges fade in without counting.
2. **Hero Illustration on Cover** — Inline SVG showing students exchanging tasks on a metro map. Monochrome line-art + terracotta accents.
3. **Dark Mode Toggle** — Toggle button in toolbar. Override CSS variables with dark values. Print always uses light mode.
4. **Parallax Cover** — Cover elements move at different scroll speeds. CSS `will-change: transform` + single rAF scroll handler. Disabled on mobile/print.
5. **Hover Reveals on Tables** — `data-detail` attributes on `<tr>` elements. JS inserts hidden detail rows, expanded on hover (desktop) or tap (mobile). Hidden in print.
6. **Reading Progress Bar** — Fixed 3px terracotta bar at top showing scroll %. Hidden in print.
7. **QR Code on Cover** — Pre-generated inline SVG QR for `https://viecz.fishcmus.io.vn`. Uses `currentColor` for dark mode compat. Prints as vector.
