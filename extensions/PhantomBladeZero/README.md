# Phantom Blade Zero（影之刃零）

Steam AppID `4115450`。扩展适配 UE 5.7 定制 fork，游戏目录结构与本仓库其他 UE5 游戏不同。

## 游戏目录结构（非标准，重点）

```
<PBZ>\
├── steam\PBZ.exe                  启动器（转发，不是注入目标）
├── platform\steam\PBZ.exe         真实游戏 exe（UE4SS 注入目标）
├── platform\steam\dwmapi.dll      UE4SS 代理 DLL
├── platform\steam\ue4ss\          UE4SS 运行时
│   ├── UE4SS.dll
│   ├── UE4SS-settings.ini
│   ├── MemberVariableLayout.ini   PBZ 定制引擎偏移修正，缺了会崩溃
│   ├── UE4SS_Signatures\GUObjectArray.lua  手写 GObjects 签名，缺了扫不到
│   └── Mods\                      UE4SS Lua / DLL mod
├── ProjectPBZ\Content\Paks\~mods\ pak / IoStore mod
├── ProjectPBZ\Content\Paks\LogicMods\  蓝图（LogicMod）mod
└── Engine\                        引擎运行时
```

因此扩展里所有路径都以 `platform/steam` 或 `ProjectPBZ` 开头，而不是游戏根目录下的常规 `Binaries/Win64` / `Content/Paks`。

## 支持的 Mod 类型

| Mod 类型 | tester 判定 | 安装位置 |
|---|---|---|
| UE4SS for Phantom Blade Zero | 归档内同时有 `dwmapi.dll` 与配套 `ue4ss/UE4SS.dll` | `platform/steam/dwmapi.dll` + `platform/steam/ue4ss/**` |
| UE4SS Script + Pak Combo | 同时有可安装 pak 与 `Scripts/`（或 `dlls/`）载荷 | pak → `~mods` 或 `LogicMods`，脚本 → `ue4ss/Mods/<ModName>/` |
| UE4SS LogicMod | 归档内任意深度含 `LogicMods/` 下的 pak / IoStore 容器 | `ProjectPBZ/Content/Paks/LogicMods/` |
| UE4SS Script Mod | 含 `Scripts/**.lua` | `ue4ss/Mods/<ModName>/` + 自动 `enabled.txt` |
| UE4SS DLL Mod | 含 `dlls/**.dll` | `ue4ss/Mods/<ModName>/` + 自动 `enabled.txt` |
| UE5 Pak Mod | 含 pak，或成对的 `.utoc` + `.ucas` | `ProjectPBZ/Content/Paks/~mods/` |
| Root Game Folder Mod | 归档内任意深度出现 `Engine/`、`ProjectPBZ/`、`platform/` 或 `steam/` 目录 | 从该目录起按路径原样覆盖 |

Root 的判定方式：对每个文件从左到右找**最浅的**一个已知顶层目录（`Engine` / `ProjectPBZ` / `platform` / `steam`），该目录之前的部分全部当作压缩包包装层丢掉，从该目录开始拼出目标路径。因此 `Engine/...`、`MyMod/Engine/...`、`A/B/C/Engine/...`、`Extracted/PBZ/Engine/...`、乃至完整游戏目录 `PBZ/Engine/...` + `PBZ/ProjectPBZ/...` 都能正确落位。取最浅匹配是为了让 `ProjectPBZ/Engine/foo.ini` 保留 `ProjectPBZ` 前缀，而不是被误判成引擎目录。

Root 类型只接管散装文件替换；`LogicMods/`、`ue4ss/` 整个目录和 `ProjectPBZ/Content/Paks` 下的容器都会被过滤掉，交给对应的专门安装器，避免同一个文件走两条路径部署。`Engine/Content/Paks` 下的引擎容器仍允许 root 覆盖。若归档本身就是完整的 UE4SS 代理安装（同时有 `dwmapi.dll` 与 `ue4ss/UE4SS.dll`），Root 类型会拒绝接管，交给 UE4SS 安装器。

不同包装层下的同名文件不会静默合并：目标路径重复时直接报错，提示压缩包里存在多个变体，需要用户只保留一个。

安装器优先级从低到高依次为 UE4SS 本体、组合包、LogicMod、脚本、DLL、pak、root。组合包排在脚本/DLL 之前，否则混合包只会被部署一半。

## 包装层与目录深度

三类 mod 都不要求固定嵌套深度，压缩包里怎么包都能识别：

- **Lua / DLL mod**：靠 `Scripts` / `dlls` 标记定位，标记之前的路径就是 mod 根。`Scripts/main.lua`（零散放根目录）、`MyMod/Scripts/main.lua`、`A/B/MyMod/Scripts/main.lua`、以及完整游戏路径 `PBZ/platform/steam/ue4ss/Mods/MyMod/Scripts/main.lua` 都会装成 `ue4ss/Mods/MyMod/`。没有 mod 名文件夹时用压缩包文件名作 folder id。
- **数据子目录不算 mod 名**：`Content`、`Data`、`Config`、`Binaries`、`Plugins`、`Paks`、`Icons`、`Menu`、`Assets` 这些段会被跳过并保留在相对路径里，所以 `MyMod/Content/Scripts/x.lua` 装成 `Mods/MyMod/Content/Scripts/x.lua`，不会变成 `Mods/Content/`。
- **Pak**：只看文件名与扩展名配对，包装深度完全无关。三件套零散放在压缩包根目录、放在 `MyMod/`、放在 `A/B/C/` 或完整的 `ProjectPBZ/Content/Paks/~mods/` 下，结果都是扁平落进 `~mods/`。
- **混合包**：pak 与脚本两半可以各自在不同深度，互不影响；`~mods` 容器和 `LogicMods` 容器会自动分流到各自目录。

一个压缩包含多个 UE4SS mod 文件夹（不论深度）时会报错并列出名字，避免把两个 mod 合并进同一个文件夹。不同包装层下的同名 pak 也报错，提示存在多个变体。

## 关键约束

- **UE4SS 必须是 PBZ 定制构建**。官方 release 不认这套目录结构，也缺少定制引擎的 `MemberVariableLayout.ini` 与 GObjects 签名，直接用会启动崩溃。因此扩展把它作为前置 Mod（`modId 128413`，即本项目的定制 UE4SS）向 Mod 管理器请求安装，并在本地 Mod 列表里标记为「前置模组」；检测到 `platform/steam/dwmapi.dll` 与 `platform/steam/ue4ss/UE4SS.dll` 同时存在时才认为前置已就绪。
- **UE4SS 运行时文件整目录透传**。归档里 `ue4ss/` 下的 `MemberVariableLayout.ini`、`UE4SS_Signatures/`、`CustomGameConfigs/` 等都会按原样部署，安装器只改写 `UE4SS-settings.ini`（关掉 `bUseUObjectArrayCache`，该构建必须关闭）与 `Mods/mods.txt`（作为普通 copy，保留宿主原版基线以便禁用时回滚）。
- **一个归档一个 UE4SS mod**。归档含多个 mod 文件夹时安装器直接报错，避免把两个 mod 合并进一个文件夹。
- **`~mods` 是唯一的普通 pak 目录**。`PBZMods` 是这个项目早期自造的目录名；它和 `~mods` 会同时挂载，同一份资源出现两个来源时没有确定胜负，已废弃。
- **LogicMod 需要 BPModLoaderMod**。`LogicMods/` 下的蓝图包由 UE4SS 的 `BPModLoaderMod` 加载，未启用时 pak 不会生效。
- **pack 成对校验**。`.utoc` 与 `.ucas` 必须成对出现，缺一个直接报错，避免部署不完整的 IoStore 容器导致读到旧数据。
- **游戏运行中不要替换容器**。`.utoc`/`.ucas` 被内存映射，替换会失败或读到不一致内容。

## 开发

```bash
cd extensions/PhantomBladeZero
pnpm lint      # tsc --noEmit
pnpm test      # test/logic.test.ts
pnpm build     # 本地构建到 extensions/PhantomBladeZero/dist/
```
