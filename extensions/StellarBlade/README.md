# 剑星（Stellar Blade）Mod Extension

本扩展为 Steam AppID `3489700`、游戏入口 `SB.exe` 提供 Mod 安装支持。安装目录和 LogicMod 判别规则参考当前 Vortex 剑星扩展，并通过 VFS 管理部署文件。

扩展会根据压缩包中的文件名、扩展名和目录结构自动选择第一个匹配的安装器，再通过 VFS 将文件部署到游戏目录。安装器优先级数字越小越高；例如优先级 `1` 会先于优先级 `10` 和 `30` 匹配。

目前支持：

- UE4SS for Stellar Blade
- UE4SS Script、DLL、LogicMod，以及 Script + LogicMod 组合包
- IoStore Pak 文件组（`.pak`、`.utoc`、`.ucas`，可附带 `.json`）
- CNS 独立配置文件（`.dekcns.json`）
- 菜单视频、普通视频和启动图替换
- 带有完整 `SB` 目录结构的整包 Mod
- Win64 引擎注入器和其他二进制 Mod

## 安装前准备

`UE4SS for Stellar Blade` 是当前扩展唯一的游戏级前置。启用 Mod 前，应先安装并启用该前置。

它对应手动配置在 `UE4SS_REQUIREMENT_MOD_ID` 中的平台 Mod `5338`，并拥有本扩展最高优先级：Mod Type 优先级为 `160`（数值越大越高），安装器优先级为 `1`（数值越小越高）。

- UE4SS 使用剑星定制版本：<https://github.com/Chrisr0/RE-UE4SS/releases>
- UE4SS 安装完成后，必须同时存在：
  - `SB/Binaries/Win64/dwmapi.dll`
  - `SB/Binaries/Win64/ue4ss/UE4SS.dll`

通常直接将下载的压缩包交给 Mod 管理器即可，不需要手动调整压缩包目录。扩展会自动处理常见的外层包装目录。

## 前置工具安装器

### 剑星定制版 UE4SS

Mod Type 优先级：`160`（最高）

安装器优先级：`1`（最高）

匹配条件：

- 压缩包的某个包装目录下存在 `dwmapi.dll`。
- 同一目录下必须存在 `ue4ss/UE4SS.dll`，即两者结构必须是 `*/dwmapi.dll` 和 `*/ue4ss/UE4SS.dll`，大小写不敏感。
- 压缩包不是 FOMOD。

安装方式：

- 以匹配成功的 `dwmapi.dll` 作为安装锚点，将它部署到 `SB/Binaries/Win64/dwmapi.dll`。
- 将与该 `dwmapi.dll` 同级的 `ue4ss` 文件夹内所有文件完整部署到 `SB/Binaries/Win64/ue4ss`，保留 `ue4ss` 内部相对结构。
- 不复制该包装目录下除 `dwmapi.dll` 和同级 `ue4ss` 文件夹以外的其他文件。

```text
UE4SS-v3/dwmapi.dll
→ SB/Binaries/Win64/dwmapi.dll

UE4SS-v3/ue4ss/UE4SS.dll
→ SB/Binaries/Win64/ue4ss/UE4SS.dll

UE4SS-v3/ue4ss/Mods/shared.txt
→ SB/Binaries/Win64/ue4ss/Mods/shared.txt
```

## UE4SS 与 LogicMod

### UE4SS Script + LogicMod 组合包

安装器优先级：`10`

匹配条件：

- 至少存在一个 `.lua` 文件。
- 至少存在一个 `.pak` 文件。
- 至少一个文件路径包含完整的 `SB` 目录段。
- 压缩包不是 FOMOD。

安装方式：

- 只处理路径中包含 `SB` 的文件。
- 丢弃 `SB` 之前的包装目录。
- 从 `SB` 开始完整保留原目录结构并部署到游戏根目录。

```text
Wrapper/SB/Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua
→ SB/Binaries/Win64/ue4ss/Mods/MyMod/Scripts/main.lua

Wrapper/SB/Content/Paks/LogicMods/MyMod.pak
→ SB/Content/Paks/LogicMods/MyMod.pak
```

这类包会作为一个整体 Mod 启用或禁用，不会在 Mod 管理器中拆成多个独立子 Mod。

### UE4SS LogicMod

安装器优先级：`11`

匹配条件：

- 压缩包文件列表中存在一个文件名恰好为 `LogicMods` 的目录项，大小写不敏感。
- 压缩包不是 FOMOD。

该规则与 Vortex 一致：只根据压缩包显式提供的 `LogicMods` 目录项判断，不读取 Pak 内部内容，也不会因为某个文件路径字符串经过 `LogicMods` 就直接命中。正常的 LogicMod 压缩包应同时包含该目录项和目录内的 Pak 文件组。

安装方式：

- 只复制路径中包含 `LogicMods` 的文件。
- 去掉 `LogicMods` 之前的目录。
- 保留 `LogicMods` 内部的相对结构并部署到 `SB/Content/Paks/LogicMods`。

```text
Wrapper/LogicMods/MyMod/MyMod.pak
→ SB/Content/Paks/LogicMods/MyMod/MyMod.pak
```

### UE4SS Script 与 DLL Mod

安装器优先级：Script 为 `14`，DLL 为 `15`

匹配条件：

- Script：至少有一个 `.lua` 文件位于 `Scripts` 目录中。
- DLL：至少有一个 `.dll` 文件位于 `dlls` 目录中。
- 压缩包不是 FOMOD。

安装方式：

- 使用 `Scripts` 或 `dlls` 的上一级目录作为 UE4SS Mod 文件夹名。
- 如果标记目录位于压缩包根目录，则使用 staging 目录名推导文件夹名。
- 将该 Mod 根目录下的文件整体部署到 `SB/Binaries/Win64/ue4ss/Mods/<Mod文件夹>`。
- 写入 `stellarBladeUe4ssFolderId` 属性。
- 如果包内没有 `enabled.txt`，自动生成空的 `enabled.txt`。

```text
CoolMod/Scripts/main.lua
→ SB/Binaries/Win64/ue4ss/Mods/CoolMod/Scripts/main.lua

CoolMod/dlls/CoolMod.dll
→ SB/Binaries/Win64/ue4ss/Mods/CoolMod/dlls/CoolMod.dll
```

## Pak、IoStore 与 CNS

### UE IoStore Pak Mod

安装器优先级：`30`

匹配条件：

- 至少存在一个 `.pak` 文件。
- 压缩包不是 FOMOD。

Tester 不要求 `.pak`、`.utoc`、`.ucas` 文件齐全或同名；完整性由 Mod 包本身负责。

安装方式：

- 收集包内全部 `.pak`、`.utoc`、`.ucas` 和 `.json` 文件。
- 丢弃压缩包目录结构，仅保留文件名。
- 统一部署到 `SB/Content/Paks/~mods`。
- 写入 `stellarBladePakFiles` 属性，记录本次部署的文件名。

普通 Pak 安装器不会检查 Pak 内部结构，也不会自动转成 LogicMod。需要部署到 `LogicMods` 的包必须按上一节提供显式的 `LogicMods` 目录结构，先命中优先级更高的 LogicMod 安装器。

```text
CoolSuit.pak
CoolSuit.utoc
CoolSuit.ucas
CoolSuit.dekcns.json

→ SB/Content/Paks/~mods/CoolSuit.pak
→ SB/Content/Paks/~mods/CoolSuit.utoc
→ SB/Content/Paks/~mods/CoolSuit.ucas
→ SB/Content/Paks/~mods/CoolSuit.dekcns.json
```

如果同一个普通 Pak 包中存在 `.pak` 和 `.dekcns.json`，JSON 会跟随整组 Pak 文件进入 `~mods`，不会被 CNS 独立 JSON 安装器抢占。显式 `LogicMods` 目录内附带的 `.dekcns.json` 则会由 LogicMod 安装器一起部署到对应的 `LogicMods` 目录。

### CNS 独立 JSON

安装器优先级：`20`

匹配条件：

- 至少存在一个文件名以 `.dekcns.json` 结尾。
- 压缩包中不能存在 `.pak`。
- 压缩包不是 FOMOD。

安装方式：

- 只复制 `.dekcns.json` 文件。
- 丢弃压缩包目录结构，仅保留文件名。
- 部署到 `SB/Content/Paks/~mods/CustomNanosuitSystem`。

```text
Options/CoolSuit.dekcns.json
→ SB/Content/Paks/~mods/CustomNanosuitSystem/CoolSuit.dekcns.json
```

## 视频与界面资源

### 菜单视频与普通视频

安装器优先级：菜单视频为 `21`，普通视频为 `22`

匹配条件：

- 菜单视频：至少有一个 `.bk2` 或 `.webm` 文件的路径包含完整的 `Menu` 目录段。
- 普通视频：至少存在一个 `.bk2` 文件。
- 压缩包不是 FOMOD。

菜单视频优先级更高，因此 `Menu/Intro.bk2` 不会被普通视频安装器抢占。

安装方式：

- 菜单视频安装器收集包内全部 `.bk2` 和 `.webm`，部署到 `SB/Content/Movies/Menu`。
- 普通视频安装器收集包内全部 `.bk2`，部署到 `SB/Content/Movies`。
- 两类安装器都会丢弃原目录结构，仅保留文件名。

```text
Menu/Background.webm
→ SB/Content/Movies/Menu/Background.webm

EVE_Title.bk2
→ SB/Content/Movies/EVE_Title.bk2
```

### 启动图

安装器优先级：`23`

匹配条件：

- 压缩包中存在文件名为 `splash.bmp` 的文件，大小写不敏感。
- 压缩包不是 FOMOD。

安装方式：

- 只复制 `splash.bmp`。
- 部署到 `SB/Content/Splash/splash.bmp`。

## 完整游戏目录与引擎注入器

### Root Game Folder Mod

安装器优先级：`40`

匹配条件：

- 至少一个文件路径包含完整的 `SB` 目录段。
- 压缩包不是 FOMOD。

安装方式：

- 只复制路径中包含 `SB` 的文件。
- 丢弃 `SB` 之前的包装目录。
- 从 `SB` 开始保留原目录结构并部署到游戏根目录。

```text
Wrapper/SB/Content/Movies/Intro.bk2
→ SB/Content/Movies/Intro.bk2
```

它是完整目录结构包的低优先级兜底；UE4SS、LogicMod、视频和 Pak 等明确类型会先匹配。

### Binaries / Engine Injector

安装器优先级：`50`（最低）

匹配条件：

- 压缩包中不能存在 `.pak`。
- 至少一个文件路径包含完整的 `Win64` 目录段，且该路径表示文件。
- 压缩包不是 FOMOD。

安装方式：

- 只复制路径中包含 `Win64` 的文件。
- 丢弃 `Win64` 及其之前的目录。
- 保留 `Win64` 后面的结构并部署到 `SB/Binaries/Win64`。

```text
Wrapper/SB/Binaries/Win64/Injector.dll
→ SB/Binaries/Win64/Injector.dll
```

## 其他说明与 Tips

- 所有安装器检测到 `fomod/ModuleConfig.xml` 后都会主动放弃匹配。当前扩展不会绕过 FOMOD 选项直接安装全部文件。
- Pak 文件当前保持原文件名部署。SDK 尚未向扩展提供完整的 Load Order 列表，因此还没有实现 Vortex 风格的排序前缀。
- 当前没有 Config 和 Save 安装器。SDK沙箱尚未提供安全的 LocalAppData 目标解析与外部部署根能力。
- 会丢弃目录结构的安装器可能把不同目录下的同名文件映射到同一目标；制作或检查 Mod 包时应避免同名冲突。
- 菜单视频只需一个视频路径包含 `Menu` 即可命中，但命中后包内所有 `.bk2`/`.webm` 都会进入 `Movies/Menu`。
- UE4SS Script/DLL 安装器会以识别到的 Mod 根目录为单位复制文件，因此同一根目录下的配置文件也会一并安装。
- UE4SS 与其他整包 Mod 可能同时提供 `UE4SS-settings.ini`。发生 VFS 冲突时，应确认希望生效的版本及覆盖顺序。
- `UE4SS for Stellar Blade` 是唯一的游戏级前置，其平台 Mod ID 配置在 `UE4SS_REQUIREMENT_MOD_ID`。
