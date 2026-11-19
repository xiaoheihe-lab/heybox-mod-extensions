# Dark Souls II: Scholar of the First Sin（Steam 335300）

只适配目前 Steam 出售的原罪学者，入口为 `Game/DarkSoulsII.exe`，只查询 335300。不把旧版 236430 与 Scholar 的安装目录混用。

- 前置与 DLL 代理包安装到 `Game/`，包含 `dinput8.dll` 的包也由本适配器接管，不依赖不存在的 Vortex 共用安装器。
- `model/`、`map/`、`param/` 等结构化资源与 `enc_regulation.bnd.dcx` 安装到 `Game/heybox-mods/`，等待 Scholar 专用资源前置加载。不会默默覆盖原版 regulation。
- 裸 DDS/PNG 不再直接宣称可加载。`tex_override`、Lighting Engine / iGP11 的贴图拦截是另一套加载能力，通用资源重定向不能替代它。
- 前置检查聚合完整文件集合，验证文件类型、Steam 身份、覆盖目录、固定配置和 DLL SHA-256；资源每次启用重新检查，前置自身安装不依赖前置已就绪。

当前已切换到我们修改后的 ME2 共享核心：`dinput8.dll` 桥接器、`.heybox-souls-loader/{modengine2.dll,lua.dll}`、`modengine.toml` 和身份/哈希 profile 作为一个根目录前置 Mod 管理，配置使用 `ME2_CONFIG`。前置包内容直接安装到 Game，不应再包一层 Game。

2026-11-19 已在真实 Steam 335300 / EXE 1.0.3.0 上用最终本地包验证有效 FacePreset.bnd 归档资源覆盖，用户从主菜单退出后进程码为 0。使用的是原版资源副本，不等于所有第三方 Mod 的效果或客户端 UI 安装流程均已验收。前置尚未发布，不虚构平台 Mod id。不要和其他加载器双核心启动。

完整源码、九文件补丁、许可证、构建清单与前置包位于 `D:\code-github\vortex-extensions\HeyboxSoulsLoader\artifacts\Souls-Prerequisites-20261119-rc1`；证据见同工作区 `REAL-GAME-TEST-20261119.md`。旧版 LeoSpecial 证明 DLL 不进入这个包。
