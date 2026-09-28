# Hyperlink audit

Audit scope: the 40 `assets/objects/object_data/*/data.json` definitions in the Black Crown Project archive, plus repository code-search checks for anchors/navigation inside `object_data`.

## Direct click navigation

No archived `on_click`, `on_show`, `on_load`, or `ui_actions` string was found containing direct browser navigation such as:

- `window.open(...)`
- `window.location` / `location.href`
- `document.location`
- an embedded `http://` or `https://` URL
- an `href` assignment
- `navigate` / `redirect`

Repository code search also returned no `<a ...>` / `href=` matches inside `assets/objects/object_data`.

## Completion destinations

39 of the 40 object definitions contain a top-level `link` field. That field is metadata, not a URL invocation inside a hotspot action.

Seven objects both contain a non-empty `link` and call `completed()` from their archived interaction actions. Those are the clearest cases where an object interaction leads into an external continuation link in the original data model:

| Object | Completion label | Archived link |
| --- | --- | --- |
| The Bindlestiff (`bindlestiff`) | Strain | `http://bit.ly/18mWr8d` |
| The Cambium (`cambium`) | Scoop | `http://bit.ly/10DQII4` |
| The Diplomat (`diplomat`) | Can You Place It? | `http://bit.ly/172IeOs` |
| The Fretgay (`fretgay`) | Pluck | `http://bit.ly/186CTG6` |
| Jenny Garganta (`jenny`) | Nestle | `http://bit.ly/17kQNbN` |
| The Semestress (`semestress`) | Listen | `http://bit.ly/10x4YWy` |
| The Wayle Map (`waylemap`) | Touch | `http://bit.ly/14ja0Ib` |

`yourgreatwork` also calls `completed(1)`, but its archived `link` field is empty. The reconstructed runtime therefore shows completion without an external-link button.

The remaining definitions may still carry a top-level `link` even when no `completed()` call exists in that object's archived action graph. I have preserved the metadata but do not auto-open it.

## Reconstruction behavior

The reconstructed viewer never auto-navigates when a hotspot is clicked. When `completed()` is reached and the object has a non-empty archived `link`, the completion overlay exposes that destination as a separate explicit link. This keeps the original continuation data visible without surprising browser navigation.
