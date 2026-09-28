# Object runtime audit

The archive contains 40 object datasets. The rebuilt runtime now exposes all 40 through one viewer.

## Runtime features required by the archive

The full audit found these action/runtime primitives:

- `setProperty(...)`
- `getProperty(...)`
- `pushProperty(...)`
- `popProperty()`
- `playSound(...)`
- `pauseSound(...)`
- `stopSound(...)`
- `toggleZoomMode()`
- `setInfoboxSection(...)`
- `setInfoboxMaximised(...)`
- `completed(...)`
- `trace(...)`
- the mutable `progress` counter used by puzzle sequences

The rebuilt engine supports nested state trees, both `property_defaults` and the older `state_defaults` key, inherited hotspots/UI actions, per-state `on_show`, variable base resolutions, and audio fallback to the original archive.

## Audio-bearing objects

The following datasets reference audio in their archived action graph:

- **The Bindlestiff** (`bindlestiff`): `crunch.mp3`, `crunch2.mp3`, `rip01.mp3`, `rip02.mp3`
- **The Diplomat** (`diplomat`): `click.mp3`, `noise.mp3`
- **Some Guttering** (`guttering`): `crack.mp3`, `crack2.mp3`, `shatter.mp3`, `shatter2.mp3`, `shatter3.mp3`
- **A Record Of Breath** (`player`): `Black Crown Audio 1.mp3`
- **A Record Of Breath** (`player2`): `Black Crown Audio 2.mp3`
- **New Breath 1** (`player3`): `Audio 3.mp3`
- **New Breath 2** (`player4`): `Audio 4.mp3`
- **The Semestress** (`semestress`): `harp1.mp3`, `harp2.mp3`, `harp3.mp3`
- **Your Great Work** (`yourgreatwork`): `open.mp3`, `panel.mp3`, `click.mp3`, `unlock.mp3`

That is 22 object-local audio references across 9 datasets.

## All datasets

1. `address` — The Dunnage Label
2. `bestiary` — A Peripheral Bestiary
3. `bindlestiff` — The Bindlestiff
4. `bindlestiff2` — The Bindlestiff (alternate/incomplete variant)
5. `cambium` — The Cambium
6. `cambium2` — The Cambium (alternate)
7. `diplomat` — The Diplomat
8. `fretgay` — The Fretgay
9. `fretgay2` — The Fretgay (alternate/incomplete variant)
10. `frontispiece` — The Bowspirit
11. `gates` — No Ingress K29
12. `guttering` — Some Guttering
13. `hislatitude` — His Latitude, The Stars
14. `incineration` — Incineration Order [Incinerated Misc. K97]
15. `jenny` — Jenny Garganta
16. `macrophile` — The Macrophile
17. `pervertslimbs` — Up Amongst A Pervert's Limbs
18. `pilot` — Jenny Garganta (pilot)
19. `pilot2` — The Pilot's Book K894
20. `player` — A Record Of Breath
21. `player2` — A Record Of Breath (alternate)
22. `player3` — New Breath 1
23. `player4` — New Breath 2
24. `potential` — Loss Of Potential D57
25. `river` — The River Upstairs
26. `riverupstairs` — The River Upstairs (alternate)
27. `rosetto` — Dear Rosetto
28. `semestress` — The Semestress
29. `stars` — His Latitude, The Stars (alternate)
30. `tightwalk` — The Tight Walk P8923
31. `vaseandcup` — The Vase and Cup K20
32. `vignettes` — Vignettes On A Disaster, Apparently Not In My Honour
33. `waylemap` — The Wayle Map
34. `waylemap2` — The Wayle Map (alternate)
35. `weevil` — The Pageant Weevil
36. `weevilhunt1` — The Abbieannia Problem
37. `weevilhunt2` — The Roasting Dance
38. `weevilhunt3` — The Weevil Hunt
39. `worstcook` — The Worst Cook [Transcript M12]
40. `yourgreatwork` — Your Great Work

Some `*2`, pilot, and duplicate-title directories are clearly alternate/prototype data rather than additional canonical objects. They are intentionally left selectable so the archive can be inspected rather than silently discarded.
