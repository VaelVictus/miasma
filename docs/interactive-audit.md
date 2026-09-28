# Interactive audit

Audited 2026-09-28, after the Bindlestiff variable and Your Great Work door-state fixes.

## Results

33 specimens; 4,952 distinct explored runtime states; 17,309 attempted UI transitions; 0 failures after repair. All eight definitions containing a completion action have a reachable completion.

| Specimen | Explored states | Transitions | Completion reached |
| --- | ---: | ---: | --- |
| address | 818 | 2743 | No completion action in definition |
| bestiary | 8 | 20 | No completion action in definition |
| bindlestiff | 11 | 16 | Yes |
| cambium | 16 | 34 | Yes |
| cambium2 | 8 | 16 | No completion action in definition |
| diplomat | 294 | 770 | Yes |
| fretgay | 7 | 8 | Yes |
| frontispiece | 2 | 2 | No completion action in definition |
| gates | 6 | 14 | No completion action in definition |
| guttering | 9 | 27 | No completion action in definition |
| hislatitude | 2 | 2 | No completion action in definition |
| incineration | 2 | 2 | No completion action in definition |
| jenny | 33 | 73 | Yes |
| macrophile | 20 | 56 | No completion action in definition |
| pervertslimbs | 8 | 20 | No completion action in definition |
| pilot | 10 | 26 | No completion action in definition |
| pilot2 | 14 | 38 | No completion action in definition |
| player | 12 | 33 | No completion action in definition |
| potential | 8 | 20 | No completion action in definition |
| riverupstairs | 28 | 80 | No completion action in definition |
| rosetto | 10 | 26 | No completion action in definition |
| semestress | 170 | 391 | Yes |
| tightwalk | 8 | 20 | No completion action in definition |
| vaseandcup | 2 | 2 | No completion action in definition |
| vignettes | 16 | 44 | No completion action in definition |
| waylemap | 99 | 185 | Yes |
| waylemap2 | 19 | 35 | No completion action in definition |
| weevil | 10 | 20 | No completion action in definition |
| weevilhunt1 | 4 | 8 | No completion action in definition |
| weevilhunt2 | 4 | 8 | No completion action in definition |
| weevilhunt3 | 6 | 14 | No completion action in definition |
| worstcook | 12 | 32 | No completion action in definition |
| yourgreatwork | 3276 | 12524 | Yes |

## Repairs

- Bindlestiff: removed the whale close-up hotspot that set view to open_bowl. No such state or corresponding artwork exists in the supplied definition/assets. The close-up and its Back button remain available; the main tear puzzle still completes. Reproduced and completed that path in the browser without console errors.
- Diplomat: support plain HTML as the main narrative when info.html has no named sections. Its archived on_load and close actions refer to section-main even though the notes file has no wrapper.

## Coverage and limits

The traversal executes every available control/hotspot at each explored state using the real engine, follows nested states and on_show actions, models closing narrative dialogs, and preserves puzzle variables, navigation stacks, zoom and completion. It checks resolved images, sounds, narrative sections, polygon structure/area, declared controls, and exact filename case. Static media/section checks include dormant definitions.

Repeated navigation can grow the archived stack indefinitely. Exploration stops expanding stacks beyond three entries; transitions crossing that bound are still checked. Progress above nine is merged because all archived progress comparisons are lower. This is a bounded state audit, not a proof over arbitrarily deep navigation histories. Network failures, old external continuation destinations and subjective audio/image quality are outside its assertions.

## Dormant branches retained

These definitions cannot be reached through the supplied actions in this audit. Their assets remain in Gallery; no new gameplay or completion behavior was invented to activate them.

- bindlestiff: `view:covered / lights:off`, `view:crack1 / lights:off`, `view:crack2 / lights:on`, `view:case / lights:on`, `view:inside / lights:on`, `view:inside_removed`, `view:inside_removed / lights:on`, `view:inside_removed / lights:off`, `view:whale / lights:off`.
- fretgay: `view:no_mole`.
- yourgreatwork: `view:s / doors:3 / selection3:3`, `view:panel3 / selection3:3`, `view:w / lock:removed`.

## Re-run

Run npm test for regression tests and the full traversal. For per-specimen JSON results, run node tests/audit-interactives.js (optionally followed by folder names).
