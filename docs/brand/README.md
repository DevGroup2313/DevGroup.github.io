# Lakay · the mark

## The mark in use: the Spiral

The owner chose the Spiral on 7 November 2026. It is a nautilus shell cut in facets like a jewel, with about three turns of chambers around a pearl. It sits on an enamel plate with a fine champagne rim. It nods to the lambi, the conch that calls people together, and to a business that grows turn by turn.

- `lakay-spiral-day.png`, `lakay-spiral-night.png`: the whole mark, flat, 512 × 512, by day and by night.
- The app draws the mark in seven layers at different depths: the plate, the engraved guilloche, the gold halo, the shell, its gold lattice, the pearl, and three sparkles. The layers live in `src/brand/lakay-mark/` (256 × 256 each). The build puts them in the page.
- In the app the mark sways, leans toward the pointer and breathes in depth. The engraving and the shell turn one way; the halo and the sparkles turn the other. A press winds it up like a flywheel (see `src/js/09-crest.js` and `src/css/crest.css`).
- The device icons (Windows, Mac, iPhone and iPad, Fire) are made from the same drawing.

## Kept as backups

- `backup/le-comptoir-rose-des-vents-*.png`: Le Comptoir's mark, a jewelled compass rose on an engraved indigo plate. It is kept whole and in its four layers, by day and by night, for use elsewhere in the app or in a future app.
- `backup/lakay-hibiscus-*.png`: the hibiscus brooch, the other jewel-cut mark offered for Lakay.
- `backup/first-round/`: the first round of marks and names (Soleil, Rose des vents, Hibiscus, Lambi), with the Le Comptoir name sheets, as the owner saw them on 7 November 2026.

## Drawing them again

`source/gen3.py` draws the Spiral (`spiral8`), the compass rose and the hibiscus as layered SVG pages; `source/render_final.js` renders each layer to PNG with Playwright. `source/gen2.py` holds the shared helpers. The pictures were drawn in code, not painted.
