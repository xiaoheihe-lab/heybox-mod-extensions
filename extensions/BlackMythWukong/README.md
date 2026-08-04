# Black Myth: Wukong Extension

Steam AppID: `2358720`

## Supported packages

- FOMOD packages supported by the shared project installer.
- UE4SS runtime packages containing `dwmapi.dll` and `UE4SS.dll` in one package tree.
- Signature Bypass packages containing `dsound.dll` and `sig.lua` in one package tree.
- UE4SS Script Mods (`Scripts` + `.lua`).
- UE4SS DLL Mods (`dlls` + `.dll`), with `enabled.txt` generated when missing.
- UE4SS Script + LogicMod combination packages rooted at `b1`.
- LogicMods rooted at an explicit `LogicMods` directory.
- Ordinary `.pak` packages deployed to `b1/Content/Paks/~mods`.
- Root packages containing an explicit `b1` directory.

Config and Save packages that deploy outside the game directory are intentionally not supported.

## Pak load order

Ordinary Pak Mods and FOMOD packages that deploy `.pak` files under `b1/Content/Paks/~mods` participate in the SDK Load Order provider. The extension maps the saved order to `AAA-<modKey>`, `AAB-<modKey>`, and later directories under `b1/Content/Paks/~mods`. All file moves use the SDK managed-deployment mutation API so VFS ownership, disable, uninstall, and rollback records stay aligned.

## Known platform limits

- Game discovery is Steam-only because the current Mod SDK store helper reads Steam installations.
- Missing UE4SS or Signature Bypass files are reported to Web as required Heybox Mods using Mod IDs `8096` and `8099` respectively.
- Vortex-only utility toolbar buttons do not have an equivalent public ModManager extension surface. Manual ModType switching is intentionally not provided.
