# Dark Souls Remastered（Steam 570940）

只适配目前 Steam 出售的 Remastered，入口为游戏根的 `DarkSoulsRemastered.exe`。不支持 Prepare to Die Edition / 211420，也不再使用 DSfix 的 `DATA/dsfix/tex_override`。

- 前置包与 DLL 代理包进入 exe 所在目录，由管理器执行冲突、禁用和回滚。
- `chr/`、`parts/`、`map/` 等有明确游戏目录结构的资源包进入 `heybox-mods/`，保留相对结构。只去掉选中资源树外的包装目录，不把外部说明、启动器一起复制进去。
- 多套可选目录、裸 DDS、只有未知文件的包不自动推断安装位置；交给现有手动安装流程。
- 资源启用时重新检查前置的完整文件集合、profile 的 Steam 身份与覆盖目录、固定配置和 DLL SHA-256。文件存在只证明部署符合配置，不证明游戏已加载。

前置配置源码位于 `src/loader-config.ts`。目前缺少可上线的前置包和 Heybox Mod id；沿用手动前置提示，未虚构平台 id。因此不能把本适配器的构建成功理解为完整游戏支持已验收。

前置基于 [Cloudef ME2 分支](https://github.com/Cloudef/ModEngine2/tree/20b7f1a3ba39138f61fdeb5cb88fb16721371130)，补齐 Hook 生命周期修复；代理在 SteamAPI_Init 初始化核心，DirectInput 调用作为后备。2026-11-19 已使用最终本地包，在 Steam 570940 / EXE 1.0.0.0 中确认有效字体副本从 heybox-mods 加载，并由用户从主菜单退出，进程码为 0。原生探针另已验证资源禁用回退、重新启用和前置禁用。

这证明加载与退出链路，不代表特定第三方 Mod 的画面/战斗或客户端 UI 安装已验收。不要和其他加载核心同时启用。构建、完整补丁、许可证及两个前置包保存在 `D:/code-github/vortex-extensions/HeyboxSoulsLoader/artifacts/Souls-Prerequisites-20261119-rc1/`，完整记录见同工作区 `REAL-GAME-TEST-20261119.md`。当前为本地验证包，未发布。

本目录保持独立可构建，便于仓库按单个游戏生成制品。与另外两款魂系适配相同的部署逻辑也保留在本目录内。
