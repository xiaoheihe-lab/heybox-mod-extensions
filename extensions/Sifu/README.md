# Sifu

Steam App ID: 2138710; minimum Mod API: 1.17.0.

Priority 30 root installer recognizes Sifu/Content, Sifu/Binaries and Sifu/Config trees, preserves nested paths, and strips arbitrary outer wrappers. Priority 25 installs ordinary Pak mods to Sifu/Content/Paks/~mods. Bare Pak files, partial paths such as Content/Paks/~mods, full Sifu/Content/Paks paths, and arbitrary wrappers around them all resolve to paths relative to the registered target, so Sifu is never duplicated. Same-stem .sig and complete .ucas/.utoc pairs are copied. FOMOD, LogicMods and loader/script bundles are rejected. Root layouts take precedence over loose Pak detection.

Reference Vortex extension: Nexus Mods site extension for Sifu. Live game validation remains outstanding.
