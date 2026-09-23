# Project Wingman

Steam App ID: 895870; minimum Mod API: 1.17.0.

Priority 30 root installer recognizes ProjectWingman/Content, ProjectWingman/Binaries and ProjectWingman/Config trees, preserves nested paths, and strips arbitrary outer wrappers. Priority 28 installs skin archives to ProjectWingman/Mods/Skins: archives containing only PNG files have common wrappers trimmed, while an explicit Skins path is used as the deployment anchor. Priority 25 installs ordinary Pak mods to ProjectWingman/Content/Paks/~mods. Same-stem .sig and complete .ucas/.utoc pairs are copied. FOMOD, LogicMods and loader/script bundles are rejected. Root layouts take precedence over skin and loose Pak detection.

Reference Vortex extension: Nexus Mods site extension for Project Wingman. Live game validation remains outstanding.
