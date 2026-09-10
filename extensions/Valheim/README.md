# Valheim / 英灵神殿

- Steam AppID: `892970`
- manifest / heybox-mod-api: `1.17.0`
- 对照：Nexus-Mods/game-valheim，commit `b5a9b7c6197d8db4f6fba2b8f78edc2c74480338`。
- 所有类型部署目标统一为 `{gamePath}`，安装指令包含完整的游戏根目录相对路径，避免重复 `BepInEx/BepInEx`。

## 前置 Mod

唯一全局前置为 BepInExPack Valheim，小黑盒 mod_id 为 `82254`（`src/constants.ts`）。

以 `winhttp.dll` 为唯一安装锚点，将其所在目录的全部文件和子目录部署到游戏根目录。外层 README、manifest、icon 等不部署。

沿用剑星的 `setup: async (discovery: any) => getExtensionRequiredMods(context, String(discovery?.path || ''))`，并保留同名 action 供宿主复查。检查发现路径下的 `winhttp.dll`：存在则返回 installed=true、空 requirements；缺失则返回顶层及嵌套 `EXTENSION_REQUIRED_MODS_MISSING`，仅包含 modId/mod_id=82254、requirement=enabled、openModDetailDialog=false 的一项。由宿主前置检查流程处理安装和启用。

程序集安装器仅兼容旧包，不再参与全局前置检测，也不保留独立 mod_id 占位符。

检测的是前置文件存在性，不证明游戏版本兼容。不会下载 Thunderstore、修改 Steam 启动项或向游戏目录直接写入文件。安装由宿主消费 copy 指令完成。不要同时启用多个程序集版本。

## 全部 tester / installer

每个类型独立注册，tester 为 `testKind(kind, files, gameId)`，installer 为 `installKind(kind, files)`；返回明确的 `modType`。按 1.17.0 API 的数值越大越优先规则，前两项优先级最高。分类互斥。

| kind / 优先级 | tester 条件 | installer 行为（相对游戏根目录） |
| --- | --- | --- |
| bepinex / 199 | 唯一 winhttp.dll（大小写不敏感） | 去掉锚点父目录前缀，完整复制同级和更深层文件，包括隐藏文件、脚本、doorstop_libs、changelog 和随包程序集；排除父目录外文件，多个锚点拒绝 |
| unstripped / 198 | 三种程序集目录之一包含 mscorlib.dll / mono.posix.dll / mono.security.dll | 只提取该目录到 unstripped_corlib，多个变体拒绝安装 |
| inslim-loader / 190 | inslimvml.ini | 从 ini 所在目录保留布局到游戏根；过滤会覆盖BepInEx 环境的 winhttp、Doorstop 配置、SlimVML.Loader、0Harmony |
| core-remover / 189 | core 下包含 BepInEx 或 0Harmony 文件 | 过滤 core、valheim_Data 和夹带的基础环境文件，保留插件、patcher、配置、资源并映射到正确位置 |
| bepinex-root / 180 | 明确含 BepInEx / plugins / patchers / config / CustomMeshes / CustomTextures 目录 | 尊重目录结构，去外包装；支持混合插件、patcher、配置和资源包 |
| engine / 179 | valheim_Data、已知根注入 DLL / Doorstop 配置，或散装 assets/resS/resource | 保留游戏根结构；散装 Unity 资源放到 valheim_Data；ReShade shader 等附属文件保留 |
| config-manager / 178 | 散装 ConfigurationManager.dll | DLL 及同包附属文件到 BepInEx/plugins/ConfigurationManager |
| inslim / 177 | InSlimVML 目录或 *_vml.dll | 明确结构保留，否则到 InSlimVML/Mods |
| better-continents / 176 | .bettercontinents | 从世界描述文件所在目录保留世界文件和地图资源到 vortex-worlds；多个不同世界根拒绝 |
| world / 175 | 同路径同名 .fwl + .db | 世界及附属文件到 vortex-worlds，供独立 VortexWorlds 插件使用 |
| vbuild / 174 | .vbuild | 仅复制蓝图到 AdvancedBuilder/Builds，扁平化文件名，重名拒绝 |
| meshes / 173 | 散装 .fbx / .obj | 网格、材质、贴图等附属文件到 BepInEx/plugins/CustomMeshes |
| textures / 172 | 散装 *tex.png | 贴图包到 BepInEx/plugins/CustomTextures |
| plugin / 150 | 其余含 .dll 的包 | DLL 及附属资源保留相对层级到 BepInEx/plugins |

明确目录布局先于散装文件判断，因此 `BepInEx/plugins/ConfigurationManager/...` 会归类为 BepInEx Root Mod，部署位置仍正确。不通过 DLL 名猜测任意 InSlimVML Mod：无目录和 `_vml.dll` 标识的 DLL 默认视为 BepInEx 插件（上游也无法可靠区分）。

相对上游：保留主要路由，统一三种程序集目标来避免动态改写 Doorstop；增加普通插件/明确目录/资源替换安装器以替代 Vortex 通用安装器；增加裸 `.fwl + .db` 配对识别。后者属于扩展覆盖，未实测 VortexWorlds 运行。ConfigurationManager 保留附属文件，上游只复制 DLL。

BepInEx 包含 winhttp.dll 时总是优先整体安装，不再走 core-remover；这是单锚点规则的预期结果。

全局：校验 AppID；兼容 Windows 分隔符和大小写；拒绝绝对路径、越界、NTFS ADS、保留设备名和目标重名；过滤目录尾斜杠条目；普通 Mod 过滤发布元数据，但 BepInEx 锚点目录内的所有文件均保留。保留无扩展名资源。配置文件采用 exists 校验和 overwrite 冲突策略，与参考适配器处理可变配置的模式一致；不表示永远不覆盖用户配置。

## 使用边界

BuildShare 蓝图仍需要 BuildShare/AdvancedBuilder，网格需要 CustomMeshes，贴图需要 CustomTextures，Better Continents 世界需要 BetterContinents 插件。它们属于特定 Mod 的依赖，当前没有在游戏级强制安装这些插件；平台 Mod 依赖应分别声明。游戏级只检查 BepInExPack Valheim。

不移植 Vortex UI、r2modman 导入、GitHub payload 更新器或程序集自动联网更新。资源替换受游戏版本影响；InSlimVML 兼容程度取决于兼容插件。无法仅靠文件名可靠辨认所有 DLL 的框架，未知脚本/任意 ZIP 不兜底复制。复杂的多选发行包应先选择一个变体。

## 验证

- `pnpm.cmd --dir extensions/Valheim test`：14 种路由、优先级、路径安全、冲突、截图包结构及前置状态。
- `pnpm.cmd --dir extensions/Valheim build:extension`。
- `pnpm.cmd --dir extensions/Valheim lint`。
- 未运行真实 Valheim / 宿主下载部署联调。

当前 BepInEx 包不再保证自带 VortexWorlds / SlimVML。世界导入与旧 InSlimVML 兼容功能需要另行提供对应插件，普通 BepInEx 安装不要求它们。Denikson 程序集安装器仅供旧包兼容。
