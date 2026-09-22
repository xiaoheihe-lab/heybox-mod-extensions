# LiesOfP

Steam App ID: 1627720; minimum Mod API: 1.17.0.

## Scope

Steam discovery, explicit game-root layouts and ordinary Pak mod installation. This is not a full port of the
Vortex extension: no Vortex load-order UI/directory prefixes, external mod import,
Game Pass discovery, automatic loader setup or saves deployment. Explicit Binaries
and Config paths can be copied by the root installer; prerequisites are not managed.

Reference: https://www.nexusmods.com/site/mods/852
The published extension description was inspected; the downloadable extension source was not retrieved. The root installer additionally preserves explicitly packaged game paths.

## Tester and installer

- Priority 30: testRoot / installRoot, mod type 1627720-root, target {gamePath}.
- Recognizes LiesofP/Content, LiesofP/Binaries or LiesofP/Config file
  trees, including arbitrary outer wrapper directories. Strips the wrapper and
  copies every safe file under those three subtrees, preserving nested paths and
  filenames (no _P suffix changes). All sibling subtrees are included.
- Files outside these recognized subtrees are ignored. Multiple wrapper roots
  are rejected as ambiguous variants; destination collisions fail. FOMOD archives
  are rejected. This is an explicit-layout installer, not an accept-all fallback.
- Priority 25's tester yields whenever a recognized root layout is present.

### Loose Pak installer

- Priority 25: testPak / installPak, mod type 1627720-pak.
- Target: {gamePath}/LiesofP/Content/Paks/~mods.
- Tester requires the matching game ID (number or string) and a safe .pak file.
- Rejects the whole archive if it includes fomod/moduleconfig.xml, LogicMods,
  .dll, .asi or .lua files. These need a different installer.
- Selects the first valid Pak's directory, strips that prefix, and copies Pak
  files within that directory and its descendants, retaining relative subfolders.
  Sibling directories outside that subtree are not selected. File listing order
  therefore matters for multi-variant archives: use an archive containing the
  desired variant, not a bundle of mutually exclusive choices.
- Handles bare files, arbitrary outer wrappers, and game/Content/Paks/~mods wrappers.
- Copies same-directory, same-stem .sig and complete .ucas/.utoc pairs alongside
  each selected Pak. Orphan companions and documentation/images are ignored;
  incomplete IO Store pairs fail installation. No signatures are generated.
- Retains Pak basenames; extension casing is normalized to lowercase.
- Preserves original source paths for SDK lookup; rejects unsafe archive paths
  and fails case-insensitive destination collisions rather than overwriting.

## Validation

Run pnpm test and pnpm lint from this directory after workspace dependencies have
been linked. pnpm test builds only the ignored local dist/LiesOfP output.
Tests cover archive routing, companion integrity, filename collisions, exclusion
rules, game discovery and registered target paths. Live Host/game loading still
requires manual verification. Root dist/ is maintained by CI.
