# Probably Stolen 适配器

适用于小黑盒 Mod 管理器 extension API 1.17.0，仅注册游戏本体 AppID `4348910`。Demo 仅用于查看游戏结构和测试，不生成 Demo 适配器。版本 `0.1.0`，当前为待游戏内验证的初版。

## 使用

在管理器的 Probably Stolen（`4348910`）下配置 developer extension，选择仓库根目录的 `dist/ProbablyStolen/index.cjs`。

Steam 路径仅通过游戏本体 AppID `4348910` 查询。非 Steam 安装或无法自动发现时，手动选择包含 `Probably Stolen.exe` 的目录。

先导入并启用一种 Windows x64 IL2CPP 预载器，再导入与该预载器兼容的模组：

- [MelonLoader 官方发行页](https://github.com/LavaGang/MelonLoader/releases)：选择 `MelonLoader.x64.zip`。已用 0.7.3 官方包核对目录结构。普通裸 DLL 默认按 MelonLoader 模组处理。
- [BepInEx 官方构建页](https://builds.bepinex.dev/projects/bepinex_be)：选择 `Unity.IL2CPP-win-x64`，不是 Mono/BepInEx 5。已用 `6.0.0-be.791+b782da4` 官方包核对结构。BepInEx 插件必须带 `BepInEx/plugins/` 路径。

MelonLoader 0.7.3 x64 已绑定小黑盒模组 `129002`，显示“前置模组”标记。首次设置游戏或调用 `getExtensionRequiredMods` 时，缺少预载器会返回 `EXTENSION_REQUIRED_MODS_MISSING`，由管理器提示安装并启用该模组。检测到手动安装且文件齐备的 MelonLoader 时不会重复提示。

完整的 BepInEx 6 IL2CPP 安装作为替代方案，不强制再安装 MelonLoader；BepInEx 插件仍需与该预载器匹配。检测到双预载器或残留的不完整 BepInEx 注入时，提示先修复冲突。安装另一种预载器前需禁用或移除原预载器；不要同时启用两个独立预载器。安装时会检查当前目录中的另一种注入 DLL，但不能阻止用户之后在管理器外手动混装或重新启用已有前置。

`getLoaderStatus` 扩展动作返回所选路径、两种预载器必需文件的缺失清单以及注入 DLL 冲突状态。`installed` 仅表示文件齐备，不表示运行成功。该动作优先使用 `setup` 收到的手动目录。

## 安装映射

| 压缩包内容 | 游戏目录中的目标 |
| --- | --- |
| `version.dll` + 完整 `MelonLoader/net6/` 运行时 | 游戏根目录，保留 `MelonLoader/` |
| `winhttp.dll` + `doorstop_config.ini` + IL2CPP core + `dotnet/` | 游戏根目录，保留运行时结构 |
| `Example.dll` 与同包配置/数据 | `Mods/`，去掉共同包装目录 |
| `Mods/`、`Plugins/`、`UserData/`、`UserLibs/` | 保留对应目录 |
| `BepInEx/plugins/`、`BepInEx/patchers/`、`BepInEx/config/` | 保留对应目录 |
| 位于明确安装目录内的 `.pss`、`.psui`、图片等 PSApi 内容 | 保留目录与配套资源；PSApi 本体需另装 |

结构化包中的 `manifest.json` 与图片会保留。裸 DLL 包的说明、预览图、包管理元数据不部署；不执行安装脚本。只有 `.pss` / `.psui`、没有明确安装目录的包不猜测目标位置。DLL 文件名不能识别其依赖的预载器，使用 BepInEx 的裸 DLL 时请先整理到 `BepInEx/plugins/`。

不识别不完整的运行时为普通插件；拒绝路径穿越、绝对路径、Windows ADS/设备名及重复目标文件。所有部署通过 installer 返回 `copy` 指令交给管理器，不直接写入游戏目录。

## 构建与校验

仓库根目录安装依赖后，在扩展目录执行类型检查和发布产物构建：

```powershell
pnpm install
cd extensions/ProbablyStolen
pnpm lint
pnpm build:extension
```

使用仓库统一构建工具，输出到根目录的 `dist/ProbablyStolen/`，与 `extensions/` 同级，清单自动补齐 `api_version: 1.17.0`。修改源码后需重新构建并同步提交该产物。`pnpm build` 生成的 `extensions/ProbablyStolen/dist/` 仅用于本地开发，不提交。

## 验证边界（2026-10-29）

- 本机 Demo 文件检查：Unity `2021.3.45f2`、IL2CPP、PE x64；存在 `GameAssembly.dll` 与 `global-metadata.dat`。
- 开发阶段的类型检查、构建和安装规则校验通过；官方运行时包的映射已检查。测试文件不随扩展提交。
- Demo 环境缺少 Steam 许可证，未完成游戏内启动验证，不能据此判断预载器兼容性。
- 未验证正式版文件结构、游戏内 Mod/PSApi 执行、管理器 UI 导入以及真实启用/禁用/卸载流程。
- 运行时识别依据包内路径，不能从文件名验证 DLL 的 CPU 架构；下载时必须选择 x64。

## 参考

- [HowToFish 实现](https://github.com/xiaoheihe-lab/heybox-mod-extensions/tree/main/extensions/HowToFish)：参考游戏、ModType、installer 和状态动作的注册方式。该适配器的 BepInEx 5 / `MLLoader` 桥接包不能直接用于本游戏的 IL2CPP 环境。
- [Probably Stolen Vortex 扩展说明](https://www.nexusmods.com/site/mods/2508)：参考公开描述中的 MelonLoader 默认目录和结构化内容规则；未复制其扩展源码或资源。
- [BepInEx IL2CPP 安装说明](https://docs.bepinex.dev/master/articles/user_guide/installation/unity_il2cpp.html)。
