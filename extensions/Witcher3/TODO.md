# Witcher 3 / Vortex parity

Reference: `D:/code-github/vortex-extensions/Vortex`, Nexus-Mods/Vortex
revision `bf963ec653ab3f65498907ecfe663a48ef9d23f3` (master, 2026-11-16).
Game-specific rules stay here; reusable deployment/lifecycle and UI contracts stay in Mod Manager.

- [x] Fix external load-order entries and discover new manual/Merger folders.
- [x] Preserve unknown mods.settings fields; keep managed enabled state authoritative.
- [x] Expose locked entries through the shared order UI and validate saves.
- [x] Add opt-in file-merge lifecycle hooks to SDK with VFS backup, rollback and removal support.
- [x] Merge menu XML groups/variables; handle missing native XML explicitly.
- [x] Apply .part.txt fragments to Documents settings; preserve player edits and remove disabled contributions.
- [x] Rebuild merged configuration when order changes.
- [x] Configure and launch Script Merger through a shared tool entry.
- [x] Read MergeInventory.xml, lock generated output, show source relationships and stale-merge reminders.
- [x] Preserve tool-owned state across reinstall/disable, without deleting generated Mods.
- [x] Refine Merger suggestions for annotation vs override scripts.
- [x] Fix bare content names, unwrapped DLC and mixed package siblings.
- [x] Detect 5.0 capabilities and report local-mod switches / long names.
- [x] Build both projects and run real SDK/adapter lifecycle fixtures.
- [ ] Supply the published Script Merger prerequisite mod_id.
- [ ] Accept the real Script Merger GUI and game compilation on the installed Host.
- [ ] Equivalent profile/collection lifecycle for backing up and restoring merged output.
- [ ] Optional one-click repair of 5.0 local-Mod switches (currently warning/manual repair).

Intentional differences: Steam only; Script Merger is delivered as a Heybox prerequisite
Mod, not downloaded from GitHub. Its published mod_id is still pending. No automatic
script porting between game versions. Profile/collection export requires an equivalent
product lifecycle before it can be claimed as supported.
