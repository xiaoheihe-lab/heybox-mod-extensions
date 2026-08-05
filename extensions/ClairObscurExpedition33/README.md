# Clair Obscur: Expedition 33 Extension

Steam AppID: `1903340`

## Scope

Only Steam discovery is supported. The extension finds `Expedition33_Steam.exe` through the Mod SDK Steam store helper and deploys only inside the game directory.

It intentionally does not support Vortex's Config or Save mod types because those write under LocalAppData rather than the game directory. Epic, GOG, Xbox discovery and Vortex-only launcher/tool actions are also outside this extension's scope.

## Supported packages

- General XML FOMOD packages through the shared project FOMOD installer.
- UE5 IO Store packages containing `.pak`, `.ucas`, and/or `.utoc`, deployed to `Sandfall/Content/Paks/~mods`.
- UE4SS Script + LogicMod combination packages rooted at `Sandfall`.
- UE4SS LogicMods rooted at an explicit `LogicMods` directory.
- UE4SS runtime packages containing `dwmapi.dll`, deployed to `Sandfall/Binaries/Win64`.
- UE4SS Script Mods (`Scripts` + `.lua`) and DLL Mods (`dlls` + `.dll`). The extension creates an empty `enabled.txt` when the package does not provide one.
- Root packages containing an explicit `Sandfall` directory and packages containing an explicit `Content` directory.
- The Vortex-compatible Binaries fallback for packages without IO Store files. It asks for confirmation before copying the original archive tree under `Sandfall/Binaries/Win64`.

Specialized installers defer every archive containing `fomod/ModuleConfig.xml` to the shared FOMOD installer.

## UE4SS prerequisite

UE4SS is a managed game prerequisite (platform Mod ID `8577`). During game setup and before enabling dependent Mods, the extension requires both `Sandfall/Binaries/Win64/dwmapi.dll` and `Sandfall/Binaries/Win64/ue4ss/UE4SS.dll`. When either is missing, it returns the standard required-Mod warning and directs the client to install/enable that prerequisite.

## IO Store file selection and load order

When an archive contains multiple IO Store Mod sets, each Pak/UCAS/UTOC group is selected as one unit so a required sidecar cannot be omitted. Flattened destination filename collisions are rejected.

Ordinary IO Store packages and FOMOD packages that place IO Store files in `Sandfall/Content/Paks/~mods` participate in the Load Order provider. The saved order is applied by moving managed deployments into `AAA-<modKey>`, `AAB-<modKey>`, and later directories. These moves use the SDK managed-deployment mutation API, preserving VFS ownership, disable/uninstall behavior, and rollback.

## SDK limits reported, not worked around

- The public extension API does not expose Vortex-style external tool registration, so Save Editor integration is not implemented.
- It also does not expose a download-manager API that could download UE4SS from an arbitrary URL and install it automatically.
- FOMOD works through the shared installer, but C# scripted installers and currently unsupported dependency variants are rejected by that installer with an explicit error.
