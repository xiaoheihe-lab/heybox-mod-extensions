# Palworld

Lua mods use the current UE4SS layout:

- New layout: `Pal/Binaries/Win64/Mods/<mod name>/...`
- Old layout: `Pal/Binaries/Win64/ue4ss/Mods/<mod name>/...`

After a Lua mod is detected, archives packaged with the old `ue4ss/Mods/<mod name>` path are normalized into the new `Win64/Mods/<mod name>` location.
