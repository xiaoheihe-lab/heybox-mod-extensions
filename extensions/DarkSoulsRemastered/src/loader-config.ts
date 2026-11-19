// This file is also consumed by the local prerequisite packaging experiment.
// Enabled resource mods share one VFS-managed directory; conflicting files stay
// under the manager's normal conflict/rollback handling, not ME2 root ordering.
export const ME2_CONFIG = `[modengine]
debug = false
crash_reporting = false
external_dll_discovery = false
external_dlls = []
script_roots = []

[extension.mod_loader]
enabled = true
load_loose_params = false
mods = [{ enabled = true, name = "heybox", path = "heybox-mods" }]

[extension.scylla_hide]
enabled = false
`

export const SOTFS_CONFIG = `[files]
loadLooseParams=0
loadUXMFiles=0
useModOverrideDirectory=1
cacheFilePaths=1
modOverrideDirectory=\\heybox-mods

[savefile]
useAlternateSaveFile=0

[misc]
chainDInput8DLLPath=
`
