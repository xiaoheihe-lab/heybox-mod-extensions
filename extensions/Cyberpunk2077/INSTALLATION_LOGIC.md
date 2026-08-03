# Cyberpunk 2077 安装逻辑说明

本文描述 `extensions/Cyberpunk2077` 当前实际执行的安装与部署逻辑。读者不需要预先了解 Heybox Mod SDK；文中会区分“扩展决定什么”和“SDK 实际做什么”。

## 一句话概览

Cyberpunk 2077 扩展并不直接解压、复制或删除游戏文件。它读取压缩包内的相对路径，识别 Mod 的结构，生成一组安装指令交给 Mod SDK；SDK 再在其受管控的 VFS/部署生命周期内处理文件安装、冲突、启用、禁用、卸载和回滚。

普通 Mod 的工作到“生成安装指令”为止。REDmod 还会在部署阶段生成官方需要的模组列表，并调用 REDmod DLC 自带的 `redMod.exe`，因此它是一条额外的安装后流程。

## 术语和边界

| 概念 | 这里的含义 |
| --- | --- |
| 压缩包 | 下载的 Mod 文件列表，所有路径都是相对路径。 |
| staging path | SDK 解压/暂存压缩包的位置；扩展只在这里读取 `info.json`、INI、预设等内容用于识别。 |
| 安装指令 | 扩展返回的 `copy`、`generatefile`、`attribute` 三类数据，不是扩展自己执行的文件操作。 |
| Mod 类型 | 安装识别的结果，用于 UI、分类及后续 REDmod load order 等流程。 |
| 部署 | SDK 将启用 Mod 的安装结果应用到游戏目录的生命周期步骤；停用/卸载会由 SDK 依据其受管控状态撤销。 |
| VFS | SDK 的受管控文件部署模型。扩展有意不复制 Vortex 的 profile/deployment 内部实现。 |

扩展注册的游戏为 Steam AppID `1091500`，游戏可执行文件是 `bin/x64/Cyberpunk2077.exe`。当前范围只支持 Steam；GOG 和 Epic 不在此实现范围内。游戏声明 `mergeMods: true`，但不支持 symlink 部署。

## 扩展启动时注册的能力

扩展启动后依次注册：

1. 游戏定义和 Steam REDmod 前置检查。
2. 可见的 Cyberpunk 2077 Mod 类型。
3. FOMOD 安装器，优先级为 100。
4. 普通压缩包的 Cyberpunk 安装流水线，优先级为 30。
5. REDmod 属性提取器、REDmod 可编辑加载顺序和手动部署动作。

FOMOD 是通用安装器：它先让用户选择文件，再由 SDK 执行选中的复制规则。普通非 FOMOD 包进入本文其余部分的“安装流水线”。FOMOD 若最终选择了 REDmod 内容，也会在选择完成后重新提取 REDmod 元数据，避免未选中的可选内容变成虚假的加载顺序项。

## 所有压缩包共用的预处理

### 路径安全

每个压缩包路径都会被标准化为 `/` 分隔的相对路径。空路径会忽略；包含 `..` 或盘符（例如 `C:`）的路径会直接报错，不能借安装过程写到游戏目录外。

### 只剥离一层“礼物包装目录”

很多压缩包形如 `SomeMod/archive/pc/mod/a.archive`。当且仅当全部文件都位于同一个顶层目录，并且去掉这一层后能出现已知游戏根目录（`archive`、`bin`、`engine`、`r6`、`red4ext`、`mods`）时，扩展把 `SomeMod` 视为冗余包装目录。

这层目录只从逻辑识别和目标路径中去掉；复制指令仍以原始路径作为源。因此 SDK 仍能在原压缩包结构里正确找到文件。

### 对“没有映射到的文件”的统一规则

专用安装器不会静默丢文件：

- 未映射的非文档文件（例如 `.exe`、未知二进制、未知配置）会使整个包退回到 fallback，保持原始相对路径安装，且必须由用户确认。
- 已映射的可执行内容之外，常见文档/图片（如 `.md`、`.txt`、`.pdf`、图片、`.doc`）会保留到 `H2077/mod-extra-files/<包名>/...`，不会混入游戏运行目录。

这条规则的目的是避免“只装识别到的一半文件”造成不可诊断的残缺安装。例外不是悄悄丢弃，而是将资料文件隔离保存。

## 安装器选择顺序

普通包按下列顺序逐一测试，首个命中的候选项拥有该包。顺序很重要：核心框架优先于一般玩法 Mod，组合包优先于单类型，REDmod 优先于许多后续路径类识别。

| 顺序 | 类型 | 主要识别标记 | 结果概述 |
| ---: | --- | --- | --- |
| 1 | CET 核心 | `bin/x64/plugins/cyber_engine_tweaks.asi` | 按原游戏目录结构安装。 |
| 2 | redscript 核心 | `engine/tools/scc.exe` | 校验完整核心文件；旧布局需确认。 |
| 3 | RED4ext 核心 | `red4ext/red4ext.dll` | 校验当前/旧核心布局；旧 `powrprof.dll` 注入需确认。 |
| 4 | 已废弃 CSVMerge | `csvmerge/csvmerge.cmd` | 直接拒绝，提示改用 TweakXL/ArchiveXL。 |
| 5 | WolvenKit CLI/Desktop | 对应可执行文件/目录 | 直接拒绝，不能作为游戏 Mod 安装。 |
| 6-13 | Audioware、TweakXL、ArchiveXL、Input Loader、Mod Settings、CyberCAT、AMM、CyberScript 核心 | 各框架的完整特征文件 | 核心包必须完整；Input Loader 旧版会补充配置，CyberCAT 改装到工具目录。 |
| 14 | ASI | `bin/x64/plugins` 下存在 `.asi` | 保留该目录树。 |
| 15 | 多类型 Mod | 规范路径中同时发现至少两种内容 | 各种内容分别映射；REDmod 子集保留部署属性。 |
| 16 | RED4ext Mod | RED4ext 插件 DLL 或常见松散 DLL 布局 | 映射到 `red4ext/plugins`，并阻止危险运行库 DLL。 |
| 17 | REDmod | 有可用 `info.json` | 严格校验后安装到 `mods/<名称>`，参与后续官方部署。 |
| 18 | AMM 内容 | AMM 标准目录或能从 Lua/JSON 内容判断的松散文件 | 放入 Appearance Menu Mod 的 Collabs/User 目录。 |
| 19-22 | CET、redscript、Audioware、TweakXL Mod | 对应的普通 Mod 文件 | 映射到各框架的数据目录。 |
| 23-25 | INI/ReShade、JSON、XML 配置 | 配置后缀及受保护路径 | 映射到配置目录，可能要求确认。 |
| 26 | 人物预设 | `.preset` | 解析内容后放入 CyberCAT 或 ACU 预设目录。 |
| 27 | Archive/ArchiveXL | `.archive` 或 `.xl`，但不在 `mods/` | 统一放到 `archive/pc/mod`。 |
| 无命中 | fallback | 任何剩余结构 | 用户确认后按压缩包相对路径安装到游戏根目录。 |

## 各类普通 Mod 的映射

### 核心框架包

核心包识别的目的不是“猜测某个 Mod 看起来像框架”，而是阻止不完整框架包覆盖已有安装。

- CET 核心包检测到 CET 主 `.asi` 后按原始游戏结构复制。
- redscript、RED4ext、Audioware、TweakXL、ArchiveXL、Input Loader、Mod Settings、AMM、CyberScript 都要求其定义的完整核心文件集合存在，否则安装报错。
- redscript 的旧 `redscript.toml` 布局，以及 RED4ext 的旧 `powrprof.dll` 注入布局，会在用户确认后继续安装。
- Input Loader 的旧布局若缺少 `engine/config/platform/pc/input_loader.ini`，会额外生成内容为 `[Player/Input]` 的 INI 文件。
- CyberCAT 是独立工具，不应混进游戏运行目录，目标固定为 `CyberCAT/...`；安装后提示用户从该目录手动启动。

### ASI、CET、redscript、TweakXL、Audioware

| 类型 | 识别条件 | 目标路径规则 |
| --- | --- | --- |
| ASI | `bin/x64/plugins` 下有 `.asi` | 整个 `bin/x64/plugins` 子树原样保留。 |
| CET Mod | CET `mods/<Mod>/init.lua` | 保留 `bin/x64/plugins/cyber_engine_tweaks/mods/...`。 |
| redscript | `r6/scripts` 下 `.reds`、`redsUserHints` 下 `.toml`，或松散 `.reds` | 已分目录的脚本保留结构；直接放在 `r6/scripts` 根的脚本会再放进以包名命名的子目录；松散 `.reds` 包的全部文件放进该子目录。 |
| TweakXL | `r6/tweaks` 下 `.yaml/.yml` | 只映射 YAML 文件到原路径。 |
| Audioware | `r6/audioware` 下 YAML 或音频格式 | 映射 YAML 和 `.wav/.ogg/.mp3/.flac` 到原路径。 |

### RED4ext Mod 与 DLL 保护

普通 RED4ext 插件以 `red4ext/plugins` 下的 DLL 或常见松散 DLL 布局识别。已有插件子目录时原样保留；DLL 直接放在插件根目录时会放入 `red4ext/plugins/<包名>/`，避免不同 Mod 的散文件互相覆盖。松散 DLL 包也会放入该隔离目录。

有一条硬性安全限制：包内若包含 `bin/x64` 下的 DLL，或顶层出现一组已知的 .NET/WPF 运行库 DLL（如 `coreclr.dll`、`clrjit.dll`、`vcruntime140_cor3.dll`），安装会被阻止。这类文件是运行环境库，不是普通 RED4ext 插件，不允许被 Mod 覆盖。

### Archive / ArchiveXL

`.archive` 和 `.xl` 文件统一落在 `archive/pc/mod`：

- 已在 `archive/pc/mod` 的文件原样保留。
- 旧式 `archive/pc/patch` 的文件迁移到 `archive/pc/mod`。
- 其他位置的 archive 文件保留其原有子路径并挂到 `archive/pc/mod` 下。

若结果在 `archive/pc/mod` 下仍有嵌套目录，扩展会提示用户：游戏或 ArchiveXL 未必会加载这种布局，但不会擅自改名或丢弃文件。

### AMM 内容

Appearance Menu Mod 内容有三种来源：

1. 已在 `.../AppearanceMenuMod/Collabs` 或 `User` 的内容直接保留。
2. 压缩包顶层的 `Collabs/...` 或 `User/...` 会补齐 AMM 根路径。
3. 单个松散 `.lua`/`.json` 会读取内容。Lua 通过字段组合识别为 Custom Appearances、Entities、Poses 或 Props；JSON 通过键集合识别为 Decor、Locations、Scripts 或 Themes。

无法可靠归类的文件会触发前述整包 fallback，而不是猜一个目录。

### INI、ReShade、JSON、XML

- 普通 INI 默认安装到 `engine/config/platform/pc/<文件名>`。
- 若第一个 INI 的内容具有 ReShade 典型键或段落，则识别为 ReShade：INI 放到 `bin/x64`，压缩包任意层级的 `reshade-shaders/...` 目录也映射到 `bin/x64/reshade-shaders/...`。
- `bin/x64/global.ini` 不进入 INI 安装器，避免错误覆盖该特殊文件。
- JSON 若已经在 `engine/config` 或 `r6/config`，按原路径映射；松散 `giweights.json` 和 `bumperssettings.json` 分别补齐到 `engine/config/giweights.json`、`r6/config/bumpersSettings.json`。顶层 `options.json` 无法分辨目标位置，整包 fallback。
- XML 已在 `r6/config` 或 `r6/input` 时保留；顶层的 `inputcontexts.xml`、`inputdeadzones.xml`、`inputusermappings.xml`、`uiinputactions.xml` 会补齐到 `r6/config`。

受保护的 JSON 或 XML（游戏核心配置、输入映射等）在没有其他未知文件时必须经过用户确认。扩展不会读取和合并游戏已有配置内容，确认后仍是 SDK 的文件覆盖语义；如果同包还混有未知有效文件，则只走一次 fallback 确认，不重复弹窗。

### 人物预设

只处理 `.preset`：

- 内容具有 CyberCAT 固定 JSON 键集时，放进 `H2077/presets/cybercat/<文件名>`。
- 内容含女性 Appearance Change Unlocker 的特征 LocKey 时，放进 `.../AppearanceChangeUnlocker/character-presets/female/`。
- 其他匹配 LocKey 的 ACU 预设放进 `male/`。

无法识别其内容或混有未知运行文件时，仍由 fallback 保存原包结构。

## 多类型 Mod

若一个包在“规范路径”中同时包含至少两类内容，会进入多类型安装器，而不是被前面某一种类型截获。参与组合判断的类型是 archive、Audioware、JSON、XML、CET、REDmod、redscript、RED4ext、TweakXL。

该安装器对每类内容调用相同的映射规则，并写入 `cyberpunkModKinds` 属性。含 REDmod 时类型为 `multi-type-redmod`，同时写入 `cyberpunkRedmodInfo` 和 `cyberpunkRedmodRequiresDeploy`，所以 REDmod 部分会进入加载顺序和部署，而同包其他文件只是普通部署文件。

受保护配置仍需确认；无法安全映射的内容仍会整包 fallback，不能只部署其中一个类型。

## REDmod：安装、加载顺序和官方部署

REDmod 不能只理解为“复制到 `mods`”。它有三个连续阶段。

### 1. 识别与结构校验

允许的根形式为：

- `mods/<目录>/info.json`：规范形式，保留原目录。
- `<目录>/info.json`：补齐到 `mods/<目录>`。
- 压缩包顶层 `info.json`：读取其 `name`，安装到 `mods/<安全化名称>`。

`info.json` 必须是 JSON，且 `name`、`version` 都是非空字符串。每个 REDmod 根目录中允许的有效运行文件仅包括：

- `info.json`
- `archives/**.archive`、`archives/**.xl`
- `customSounds/**.wav`
- `scripts/core|cyberpunk|exec|samples|tests/**.script|.ws`
- `tweaks/base/gameplay/static_data/**.tweak`
- `tweaks/ep1/gameplay/static_data/**.tweak`

文档和图片可作为额外文件隔离保存；其他未知文件会报错。仅有 `info.json` 的包也会拒绝，除非 `customSounds` 中的全部条目都是 `mod_skip`。

通过校验后，扩展产生复制指令和两项属性：`cyberpunkRedmodInfo`（名称、版本、`mods/<目录>`）以及 `cyberpunkRedmodRequiresDeploy: true`。

### 2. 可编辑加载顺序

每个 REDmod 根目录都是一个独立加载顺序项，即一个普通 Mod 包可贡献多个 REDmod。条目 ID 由 SDK Mod key 和 `mods/<目录>` 组成，避免同名目录在不同包之间冲突。

顺序按当前 Heybox 用户和 AppID 的作用域持久化。已保存的顺序优先；新条目排在末尾并按目录名稳定排序。禁用条目仍保留位置，重新启用后回到原位置；禁用的条目不会写入本次部署列表。已卸载、重命名或不再有效的条目会自然从当前条目集合中消失。

### 3. 部署到官方 REDmod 工具

保存/部署加载顺序时，扩展会：

1. 从启用的条目按 UI 顺序取得 `mods/<目录>` 的目录名。
2. 原子写入 `<游戏目录>/H2077/modlist.txt`，每行一个目录名。
3. 原子写入 `<游戏目录>/H2077/Load Order/heybox-managed.json`，保存本次条目和 revision，供诊断而非游戏读取。
4. 检查 Steam REDmod DLC 是否同时提供 `tools/redmod/bin/redMod.exe` 和 `tools/redmod/metadata.json`。
5. 调用：

```text
redMod.exe deploy -force -root=<游戏目录> -rttiSchemaFile=<游戏目录>/tools/redmod/metadata.json -modlist=<游戏目录>/H2077/modlist.txt
```

目录 `mods`、`r6/cache/modded`、`H2077/Load Order` 会在游戏 setup 时预先创建。若工具文件缺失，加载顺序和诊断文件仍已保存，但会以 `REDMOD_TOOL_MISSING` 失败，不会假装 REDmod 部署成功；执行器报错则返回 `REDMOD_DEPLOY_FAILED`。

### REDmod DLC 与 Steam 启动参数

游戏页面会检查官方免费 DLC（Steam AppID `2060310`）。真正的可用条件是 `redMod.exe` 和 `metadata.json` 都存在；`REDprelauncher.exe` 仅作为诊断信息，不决定通过与否。缺失时，通用 Steam 前置弹窗引导安装并支持手动重新检查，普通非 REDmod Mod 不会因此被阻塞。

首次成功部署非空 REDmod 列表后，扩展检查本机所有 Steam 用户的启动参数。缺少 `-modded` 时会征求用户同意，在 Steam 已完全关闭的前提下保留原参数并追加 `-modded`，然后验证写入结果并尝试重启 Steam。用户取消、Steam 未关闭、部分用户写入失败或重启失败都会给出通知；扩展不会自动删除已经存在的 `-modded`，后续部署可再次补齐。

## fallback 的真实含义

fallback 不是“安装失败后什么都不做”，而是一个显式保守策略：弹窗说明无法识别当前结构，用户确认后把预处理后的相对路径直接作为游戏根目录下的目标路径。用户取消会中止安装，不会返回部分安装指令。

它覆盖完全未知的包、歧义的顶层 `options.json`、随机 XML、受保护配置树中的未知 JSON，以及任何专用规则只识别到一部分有效运行文件的情形。这样保留了高级用户提供的正确游戏根目录包，同时不会让自动识别损坏其余文件。

## 当前明确不做的事

- 不支持 GOG/Epic 安装发现与 REDmod 前置流程。
- 不自动把传统 Archive Mod 转换为 REDmod。
- 不把 TweakDB/LUT 当作可安装类型。
- 不读取、比较或合并游戏内现有 JSON/XML；配置覆盖由 SDK 的部署与冲突模型处理。
- 不集成 REDlauncher、手动 REDdeploy 操作或可直接启动的 CyberCAT 工具入口；CyberCAT 当前仅被正确安装并提示位置。
- 不伪造缺失的 SDK 能力；需要新 SDK API 时应在 SDK 层补齐，而不是在扩展中绕开其生命周期。

## 关键源码入口

| 关注点 | 文件 |
| --- | --- |
| 启动和注册 | `src/index.ts`、`src/game.ts`、`src/modTypes.ts` |
| 普通包流水线 | `src/installers/pipeline.ts` |
| 路径安全、包装目录 | `src/package.ts` |
| 核心/玩法/配置/AMM/预设 | `src/installers/core.ts`、`gameplay.ts`、`config.ts`、`amm.ts`、`preset.ts` |
| 多类型和 fallback | `src/installers/multitype.ts`、`shared.ts` |
| REDmod 格式和安装属性 | `src/redmod/metadata.ts`、`attributes.ts`、`fomodAttributes.ts` |
| REDmod 加载顺序与执行器 | `src/loadOrder/provider.ts`、`deployer.ts`、`index.ts` |
| REDmod DLC、Steam 参数 | `src/requirements/redmod.ts`、`src/launchOptions/coordinator.ts` |
