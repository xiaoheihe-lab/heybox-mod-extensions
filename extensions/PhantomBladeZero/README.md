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

安装器优先级从低到高（数字小者先匹配）：UE4SS 本体 → 组合包 → LogicMod → 脚本 → DLL → UE4SS mod 文件夹 → 项目 Content → Paks 目录 → pak → Binaries → Root。

| Mod 类型 | tester 判定 | 安装位置 |
|---|---|---|
| UE4SS for Phantom Blade Zero | 同目录下有代理 DLL（`dwmapi.dll` / `xinput1_3.dll` / `xinput1_4.dll`）或 `UE4SS-settings.ini`，且配套 `ue4ss/UE4SS.dll` 或平铺的 `UE4SS.dll` | `platform/steam/<代理DLL>` + `platform/steam/ue4ss/**`（平铺布局则整目录落到 `platform/steam/`） |
| UE4SS Script + Pak Combo | 同时有可安装 pak 与 `Scripts/`（或 `dlls/`）载荷 | pak → `~mods` 或 `LogicMods`，脚本 → `ue4ss/Mods/<ModName>/` |
| UE4SS LogicMod | 归档内任意深度含 `LogicMods/` 目录 | `ProjectPBZ/Content/Paks/LogicMods/`（同目录的 info 文件一并保留） |
| UE4SS Script Mod | 含 `Scripts/**.lua` | `ue4ss/Mods/<ModName>/` + 自动 `enabled.txt` |
| UE4SS DLL Mod | 含 `dlls/**.dll` | `ue4ss/Mods/<ModName>/` + 自动 `enabled.txt` |
| UE4SS Mod Folder | 含 `enabled.txt` 所在文件夹，或散装 `**.lua` | `ue4ss/Mods/<文件夹名>/` + 自动 `enabled.txt` |
| Project Content Folder | 归档根或单层包装下以 `Content/`、`Config/`、`Binaries/` 开头 | `ProjectPBZ/<相对路径>` |
| UE5 Pak Mod (Paks folder) | pak 位于**非** `~mods` / `LogicMods` 的 `Paks/` 目录树内 | `ProjectPBZ/Content/Paks/<相对路径>` |
| UE5 Pak Mod | 含 pak，或成对的 `.utoc` + `.ucas`，且无脚本/DLL/项目树混装 | `ProjectPBZ/Content/Paks/~mods/`（扁平化） |
| Binaries | 含 `ReShade.ini`、裸 ReShade preset `.ini`，或散装 `.dll` | `platform/steam/<相对路径>` |
| Root Game Folder Mod | 归档内任意深度出现 `Engine/`、`ProjectPBZ/`、`platform/` 或 `steam/` 目录 | 从该目录起按路径原样覆盖 |

### 与 Nexus 官方 Vortex 扩展的对应关系

Nexus 官方的 `phantombladezero` 扩展（`Nexus-Mods/gdl-games`，v1.0.0）用 14 条声明式 glob 规则实现。本扩展按「以我们为主体、以 Nexus 为补充」的原则对齐：

| Nexus 规则 | 本扩展 | 说明 |
|---|---|---|
| `ue4ss-injector` | UE4SS 本体 | 补充识别 `xinput1_3/1_4` 代理与平铺运行时 |
| `root` / `wrapped-root` | Root Game Folder Mod | 两者都按最浅已知顶层目录锚定，包装层自动剥离 |
| `content-folder` | Project Content Folder / Paks 目录 | 拆成 Content 与 Paks 两条，`Paks/` 树保留完整相对路径 |
| `reshade` / `reshade-preset` | Binaries | 合并为一个类型，内部区分 ReShade.ini、preset、散装 DLL |
| `logicmods` | UE4SS LogicMod | 一致 |
| `ue4ss-lua` / `ue4ss-lua-enabled` / `ue4ss-cpp` / `ue4ss-lua-bare` | 脚本 / DLL / UE4SS Mod Folder | 按载荷标记合并为三类 |
| `config-ini` | **不处理** | Engine.ini 类配置本就属于 `%LOCALAPPDATA%`，按需求跳过 |
| `pak` / `pak-iostore` / `pak-alt` | UE5 Pak Mod / Paks 目录 | 成对校验与扁平化一致 |

与官方不同、保留本扩展行为的地方：

- **UE4SS 是硬前置**：官方把 UE4SS 当普通 mod 安装，本扩展通过 `modId 128413` 声明为前置模组，并检测代理 DLL + 运行时就绪。
- **就地改写运行时配置**：安装 UE4SS 时强制关闭 `bUseUObjectArrayCache`，`mods.txt` 存为 `mods.txt.original` 保留宿主基线。
- **一个归档一个 UE4SS mod**：多 mod 文件夹直接报错，官方则是逐个 glob 路由。

Root 的判定方式：对每个文件从左到右找**最浅的**一个已知顶层目录（`Engine` / `ProjectPBZ` / `platform` / `steam`），该目录之前的部分全部当作压缩包包装层丢掉，从该目录开始拼出目标路径。因此 `Engine/...`、`MyMod/Engine/...`、`A/B/C/Engine/...`、`Extracted/PBZ/Engine/...`、乃至完整游戏目录 `PBZ/Engine/...` + `PBZ/ProjectPBZ/...` 都能正确落位。取最浅匹配是为了让 `ProjectPBZ/Engine/foo.ini` 保留 `ProjectPBZ` 前缀，而不是被误判成引擎目录。

**游戏相对路径（game-relative）归档优先归 Root**：只要归档里出现 `ProjectPBZ/`、`Engine/`、`platform/` 或 `steam/` 顶层目录，就整体交给 Root，不再拆分给 pak / 脚本 / 组合包安装器。这条规则来自官方实测：混合包若被拆开，落在专门目录之外的那一半会被静默丢弃。同理，game-relative 的 UE4SS 本体也归 Root，避免 `take: parent` 把 pak 甩掉。

不同包装层下的同名文件不会静默合并：目标路径重复时直接报错，提示压缩包里存在多个变体，需要用户只保留一个。

## 包装层与目录深度

各类 mod 都不要求固定嵌套深度，压缩包里怎么包都能识别：

- **Lua / DLL mod**：靠 `Scripts` / `dlls` 标记定位，标记之前的路径就是 mod 根。`Scripts/main.lua`（零散放根目录）、`MyMod/Scripts/main.lua`、`A/B/MyMod/Scripts/main.lua`、以及完整游戏路径 `PBZ/platform/steam/ue4ss/Mods/MyMod/Scripts/main.lua` 都会装成 `ue4ss/Mods/MyMod/`。没有 mod 名文件夹时用压缩包文件名作 folder id。
- **数据子目录不算 mod 名**：`Content`、`Data`、`Config`、`Binaries`、`Plugins`、`Paks`、`Icons`、`Menu`、`Assets` 这些段会被跳过并保留在相对路径里，所以 `MyMod/Content/Scripts/x.lua` 装成 `Mods/MyMod/Content/Scripts/x.lua`，不会变成 `Mods/Content/`。
- **Pak**：只看文件名与扩展名配对，包装深度完全无关。三件套零散放在压缩包根目录、放在 `MyMod/`、放在 `A/B/C/` 下，结果都是扁平落进 `~mods/`。
- **混合包**：pak 与脚本两半可以各自在不同深度，互不影响；`~mods` 容器和 `LogicMods` 容器会自动分流到各自目录。
- **UE4SS 本体**：代理 DLL 所在目录即安装根，`ue4ss/` 子树整目录透传；平铺布局（`UE4SS.dll` 紧邻代理 DLL）也支持。

一个压缩包含多个 UE4SS mod 文件夹（不论深度）时会报错并列出名字，避免把两个 mod 合并进同一个文件夹。不同包装层下的同名 pak 也报错，提示存在多个变体。

## 关键约束

- **UE4SS 必须是 PBZ 定制构建**。官方 release 不认这套目录结构，也缺少定制引擎的 `MemberVariableLayout.ini` 与 GObjects 签名，直接用会启动崩溃。因此扩展把它作为前置 Mod（`modId 128413`，即本项目的定制 UE4SS）向 Mod 管理器请求安装，并在本地 Mod 列表里标记为「前置模组」；检测到 `platform/steam` 下任一代理 DLL（`dwmapi.dll` / `xinput1_3.dll` / `xinput1_4.dll`）与 `ue4ss/UE4SS.dll`（或平铺 `UE4SS.dll`）同时存在时才认为前置已就绪。
- **UE4SS 运行时文件整目录透传**。归档里 `ue4ss/` 下的 `MemberVariableLayout.ini`、`UE4SS_Signatures/`、`CustomGameConfigs/` 等都会按原样部署，安装器只改写 `UE4SS-settings.ini`（关掉 `bUseUObjectArrayCache`，该构建必须关闭）与 `Mods/mods.txt`（作为普通 copy，保留宿主原版基线以便禁用时回滚）。
- **一个归档一个 UE4SS mod**。归档含多个 mod 文件夹时安装器直接报错，避免把两个 mod 合并进一个文件夹。
- **禁止符号链接部署**（`supportsSymlinks: false`）。游戏带 `global.utoc`，属于 IoStore；链接部署时 `.utoc`/`.ucas` 读回 0 字节，UE5 Zen 加载器会在启动时崩溃。Nexus 官方扩展与实测 A/B 都是这个结论，硬链接/移动部署正常。
- **`~mods` 是唯一的普通 pak 目录**。`PBZMods` 是这个项目早期自造的目录名；它和 `~mods` 会同时挂载，同一份资源出现两个来源时没有确定胜负，已废弃。
- **LogicMod 需要 BPModLoaderMod**。`LogicMods/` 下的蓝图包由 UE4SS 的 `BPModLoaderMod` 加载，未启用时 pak 不会生效。
- **pack 成对校验**。`.utoc` 与 `.ucas` 必须成对出现，缺一个直接报错，避免部署不完整的 IoStore 容器导致读到旧数据。
- **游戏运行中不要替换容器**。`.utoc`/`.ucas` 被内存映射，替换会失败或读到不一致内容。
- **安装前预建目录**。`setup` 会创建 `~mods`、`LogicMods`、`ue4ss/Mods`，否则首次启用 mod 时会报「部署目标未知」。
- **用户配置类 mod 不处理**。`Engine.ini` / `Game.ini` / `GameUserSettings.ini` / `Input.ini` / `Scalability.ini` 属于 `%LOCALAPPDATA%\ProjectPBZ\Saved\Config\Windows`，本扩展不接管；这类文件不会被误判成 ReShade preset。

## 开发

```bash
cd extensions/PhantomBladeZero
pnpm lint      # tsc --noEmit
pnpm test      # test/logic.test.ts
pnpm build     # 本地构建到 extensions/PhantomBladeZero/dist/
```
