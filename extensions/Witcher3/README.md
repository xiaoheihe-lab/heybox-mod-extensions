# The Witcher 3: Wild Hunt

Steam AppID `292030`; minimum Mod Manager domain SDK `1.19.0`.
The published `heybox-mod-api` dependency remains unchanged; `src/runtime.ts`
describes the additive interfaces and checks their availability at activation.

This adapter follows the Vortex Witcher 3 layout rules while using the Mod Manager's
normal VFS deployment lifecycle. It recognizes `Mods`, `DLC`, menu configuration files
under `bin/config/r4game/user_config_matrix/pc`, `*.part.txt` menu patches and mixed
`Mods` + `DLC` archives. It supports the Steam app IDs used by the standard and Wild
Hunt package entries.

Installer matching follows the Vortex split between the Script Merger tool, menu mods,
root `content/` packages, `Mods`/TL packages, DLC packages and mixed `mod*/content` +
`dlc*/content` archives. A dedicated Script Merger installer deploys the complete tool
subtree into `<gamePath>/WitcherScriptMerger`, including companion tools. Config and
inventory files use independent copies rather than hard links into the file pool.

Script Merger uses the same Heybox prerequisite flow as UE4SS adapters. Setup and
`getExtensionRequiredMods` check whether `WitcherScriptMerger/WitcherScriptMerger.exe`
exists as a file, so a manual installation at that location is accepted too.
`SCRIPT_MERGER_REQUIREMENT_MOD_ID` in `src/constants.ts` is intentionally unset until
the tool is published: no fake ID, prerequisite dialog, or blocking guard is emitted
until that constant is configured. `getScriptMergerStatus` still reports actual presence
and `requirementConfigured` while publication is pending.

Once configured, installer planning checks final destinations for
`Mods/<name>/content/scripts/**/*.ws` across content, Mods, menu, mixed and root layouts.
If the tool is missing, the installer returns the existing required-mod error before
game files are deployed; the shared UI installs/enables the prerequisite and resumes
the original enable only after its file check passes. Texture-only packages and the
Script Merger installer do not enter this blocking path. This detects script-bearing
packages, not actual conflicts, and does not infer dependencies from bundled content.

The adapter also registers the generic load-order provider used by the Mod Manager's
shared drag-and-drop dialog. It projects installed `Mods/<name>` folders into the
standard SDK entry format, reads existing `Documents/The Witcher 3/mods.settings`,
and writes the final ordered list back during the provider's serialize hook. The SDK
handles revisions and lifecycle serialization; the adapter owns the file format.
The dialog also includes manual and Merger folders without an existing INI section.
A clean refresh observes external changes; pending or failed saves retain the SDK
desired order. Saving preserves unknown fields/comments. Merger outputs are locked
at the top, with both UI and SDK validation. Generated Mods remain external and are
never deleted by the tool installer.

Reference: maintained [Nexus-Mods/Vortex Witcher 3 adapter](https://github.com/Nexus-Mods/Vortex/tree/bf963ec653ab3f65498907ecfe663a48ef9d23f3/extensions/games/game-witcher3/src),
revision `bf963ec653ab3f65498907ecfe663a48ef9d23f3` fetched on 2026-11-16.
The archived `vortex-games` repository is no longer the current reference.

SDK staging is the extracted input; installer destinations are rebased to the game
directory by SDK. Vortex's destinationPath must not be copied literally. Bare content
packages receive stable names from SDK identity; explicit `modName/content` paths remain.

Menu XML merges `UserConfig/Group` and `VisibleVars/Var` by ID while retaining unrelated
native entries. Known `.part.txt` fragments contribute to Documents `input.settings`,
`user.settings` and `dx12user.settings`; they are not deployed as game content. Enable,
disable and reorder rebuild from original contributions. Player changes survive the
rebuild and final removal. Missing native XML asks for confirmation; missing Documents
settings requires running the game once. On 5.0, the absent DX11 XML is excluded from
merging and `user.settings.part.txt` is skipped. Status warns about disabled local-Mod
switches and names over 63 characters; master switches stay player-controlled.

The shared tool entry configures game, vanilla `content/content0/scripts` and Mods
paths, launches Script Merger without a shell, and reads `MergeInventory.xml` on exit.
It shows output/source relationships, missing outputs and stale-merge reminders.
A zero exit records the run; it does not prove every conflict was resolved. Mutations
and sorting are blocked during execution/result processing. Tool config and inventory
survive normal disable/reinstall through lifecycle hooks; packaged inventories are
excluded. Annotation-only scripts do not trigger the Merger prerequisite.

Validation:

```powershell
pnpm lint
pnpm test
pnpm build:extension
node test/run-sdk-integration.mjs <absolute-path-to-hb-pc-mod-sdk>
```

The optional integration command uses real SDK Worker, XML codec and VFS in isolated
temporary game/Documents directories. It never launches the actual game or real Merger.
Generic SDK process tests exercise actual child processes separately.

Remaining parity boundaries: GOG/Epic are out of scope. Vortex profile switching and
collection import/export of merged output require corresponding product lifecycle
hooks. The 5.0 master-switch check currently guides the user to game settings rather
than providing Vortex's one-click repair. Real Merger GUI and game compilation require
runtime acceptance with the published prerequisite package. No automatic cross-version
script compatibility is claimed.
