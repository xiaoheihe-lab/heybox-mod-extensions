# 明末：渊虚之羽（WUCHANG: Fallen Feathers）

Steam App ID `2277560`，API `1.17.0`。根据 ChemBoy1 的 Vortex 扩展 0.2.0 的安装行为独立实现，复用仓库 FOMOD 工具。

## 必需环境

`src/constants.ts` 的 `UE4SS_REQUIREMENT_MOD_ID = '123673'` 对应盒内 UE4SS 前置 Mod。
setup 与 `getExtensionRequiredMods` 共用检测：需要 Binaries 下的 `dwmapi.dll` 和 `ue4ss/UE4SS.dll` 同时存在。
缺失时返回 `EXTENSION_REQUIRED_MODS_MISSING` 和同一份 requirements。
Mod Enabler 提供安装器，但不额外列为必需环境，也不使用 Vortex/Nexus 的自动下载事件。

游戏通过 Steam API 发现。setup 提供手动路径时也可识别 `gamelaunchhelper.exe`，使用 Xbox 的 `WinGDK` 布局；其余使用 `Win64`。
这是目录布局支持，不包含 Epic/Xbox 商店自动发现或启动器集成。完整目录包保持作者提供的 Win64/WinGDK 路径，不改写包内商店布局。

## 安装顺序

Installer 数字越小越先；Mod Type 使用相反方向的优先级，确保类型识别顺序相同。
所有自动安装器排除 FOMOD，并检查目标重名。归档路径统一分隔符、忽略 `.` 和根目录条目，复制时保留原始 source。

| 顺序 | 类型 | 判定和目标 |
| --- | --- | --- |
| 1 | UE4SS | `dwmapi.dll` 和同根 `ue4ss/UE4SS.dll`；根目录内容部署到 `Project_Plague/Binaries/<Win64或WinGDK>` |
| 2 | Mod Enabler | `dsound.dll` 及其子树内 `sig.lua`；以 DLL 所在目录为根部署到 Binaries |
| 3 | UE4SS Mods Folder | 文件路径含 `ue4ss/Mods/<Mod名>/...`，无需目录项；将 Mods 下完整内容部署到 Binaries 下 `ue4ss/Mods`，去掉外层包装目录 |
| 25 | Combo | 显式 `Project_Plague` 目录下同时有 Lua、Pak；保留该目录结构部署到游戏根 |
| 27 | LogicMod | 显式 `LogicMods` 目录及其中 Pak；整棵子树放到 `Project_Plague/Content/Paks/LogicMods` |
| 29 | Pak | `.pak`；多 Pak 弹出选择，取消/空选择终止，文件扁平放到 `Project_Plague/Content/Paks/~mods` |
| 33 | Script | 显式 `Scripts` 目录及其下 Lua；父目录整体放到 Binaries 下 `ue4ss/Mods/<Mod名>` |
| 35 | DLL | 显式 `dlls` 目录及其下 DLL；父目录整体放到 Binaries 下 `ue4ss/Mods/<Mod名>` |
| 37 | Root | 显式 `Project_Plague` 目录；保留其结构部署到游戏根 |
| 39 | Content | 显式 `Content` 目录；部署到 `Project_Plague/Content` |
| 45 | Binaries | 不含 Pak、已知独立 Config 或 Save 的兜底包；保留包内结构部署到 Binaries |
| 100 | FOMOD | 共享 FOMOD 安装流程；选中 destination 相对于 `Project_Plague/Content/Paks/~mods` |

Script/DLL 缺少 Mod 根 `enabled.txt` 时使用 `generatefile` 补空文件；保持已有文件内容。
UE4SS Mods Folder 支持多个模组、大小写和两种斜杠，保留配置、地图、标记等所有文件及原有启用状态，不额外生成 enabled.txt。Mods 子树外的说明文件不复制；若存在子树外的 Pak，则留给原有 Combo/LogicMod/Pak 分组处理。不同源文件映射到同一目标时拒绝安装。
UE4SS 的 settings、根 Mods 下的 mods.txt/mods.json 使用已存在校验与覆盖策略，以兼容运行时修改。
普通 Pak 按参考扩展 `IO_STORE=false` 行为仅安装 `.pak`，不自动携带 `.sig/.ucas/.utoc`。
普通 Pak 通过 VFS 托管移动到三位字母排序目录；禁用条目保留位置，FOMOD 与 LogicMods 不参与排序。
`pakalt` 仅提供 `Content/Paks` 手动 Mod Type，不注册自动 tester-installer，与参考扩展一致。

Config、Save 两组本次不接入。独立的 Engine.ini/Scalability.ini/Input.ini/Game.ini 和 `.sav` 不进入 Binaries 兜底。
明确的 Root、Content、UE4SS 子树内附带配置仍保留。SDK 暂无 LocalAppData 目标解析能力。

相较参考实现，目录按真实父子关系筛选，不用 substring；缺失有效载荷、多个同名锚点和目标冲突会拒绝，避免静默部分部署。
LogicMods 从目录锚点保留整个子树，不以首个 Pak 所在目录截断。

## 验证与构建

```powershell
pnpm.cmd --dir extensions/Wuchang test
pnpm.cmd --dir extensions/Wuchang lint
pnpm.cmd run build:extension Wuchang
```

产物位于 `dist/Wuchang`。测试覆盖注册顺序、环境检查、Win64/WinGDK 路径、安装指令、FOMOD、选择取消、裸 Pak 路径兼容和加载顺序；游戏内加载仍需实际客户端验证。
