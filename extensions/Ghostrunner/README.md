# Ghostrunner

Steam App ID: `1139900`; minimum Mod API: `1.17.0`.

## Installation rules

Two installers, with higher numeric priority evaluated first:

| Priority | Tester | Installer | Layout |
| --- | --- | --- | --- |
| 30 | `testWrappedPak` | `installWrappedPak` | The three explicit Paks layouts below |
| 25 | `testLoosePak` | `installLoosePak` | First pak's directory, only when no supported wrapped pak exists |

Both testers accept only this game and their supported `.pak` layouts.
All destinations below are relative to `Ghostrunner/Content/Paks`:

| Archive path | Destination |
| --- | --- |
| `.../Paks/name.pak` | `name.pak` |
| `.../Paks/LogicMods/name.pak` | `LogicMods/name.pak` |
| `.../Paks/~mods/name.pak` | `~mods/name.pak` |
| `name.pak` at archive root | `LogicMods/name.pak` |
| `Folder/name.pak` (fallback) | `LogicMods/name.pak` |

The wrapped installer copies same-directory, same-basename `.sig` files alongside
each pak, matching case-insensitively. The priority-25 fallback finds the first
valid `.pak` in archive listing order, then copies every `.pak` and `.sig` directly
in that same directory into LogicMods, stripping outer folders. It excludes child
directories, other directories, images, text, and other file types. Signatures need
not have a matching pak in this fallback. Missing signatures are not generated. The naked-pak default
is a user-selected convention, not automatic identification of a LogicMod.
Explicit Paks wrappers take precedence for the archive: if both wrapped and loose
paks exist, only the wrapped group is installed. Multiple supported wrapped
layouts are handled together. Wrapper directories before Paks are stripped. Destination collisions
fail explicitly instead of silently choosing one file. Unsafe paths and directory
entries are excluded. Source paths are retained for SDK file lookup.

## Reference and prerequisites

The original reference was spuds' **ghostrunner vortex support 1.1.1**, Nexus
[site/mods/333](https://www.nexusmods.com/site/mods/333), file ID `2695`.
Its fixed `~mods` deployment rule has been replaced by the routing above.
The reference has no prerequisite Mod detection, declaration, or download;
its setup only creates a directory. This adapter does not install a loader or
generate signatures. Individual mods may still require UnrealModLoader or other
prerequisites according to their own instructions.

Game discovery uses the host's Steam helper; GOG registry discovery is not ported.
Run `pnpm test` in this directory for a local build and focused installer tests.
Live game loading is left for manual validation.
