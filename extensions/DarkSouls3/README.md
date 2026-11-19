# Dark Souls III（Steam 374320）

入口为 `Game/DarkSoulsIII.exe`。资源加载以普通启动时生效的前置 Mod 为目标，不把外部 ME2 launcher 作为默认必需步骤。

- 前置与 DLL 代理包进入 `Game/`，正常处理同名 DLL 冲突、禁用与回滚。
- `chr/`、`parts/`、`map/`、`param/` 等资源和 `regulation.bin` 进入 `Game/heybox-mods/`，保持结构；由前置执行归档路径与文件打开重定向。
- 按整个资源树确定包装根，排除树外文件；不再对每个路径单独搜索 `game` 并把其余任意文件都安装进游戏目录。
- 未识别的裸文件、多个可选资源根不自动安装。通用资源前置不提供参数合并、任意 DLL 的 external_dlls 配置，也不替代 Mod 自己的专用启动程序。
- 每次启用资源检查前置文件类型、profile 身份与覆盖目录、固定配置及 DLL SHA-256，防止把另一个同名 `dinput8.dll` 当作可用前置。

前置配置在 `src/loader-config.ts`。原生实验使用 [Cloudef ME2 分支](https://github.com/Cloudef/ModEngine2/tree/20b7f1a3ba39138f61fdeb5cb88fb16721371130) 与独立代理。2026-11-18 已在真实 DS3 1.15.2.0 中观察到核心加载、归档路径检查和标题画面；移除资源加载不需要的旧补丁后不再出现此前三条补丁失败日志。尚未完成有效归档资源覆盖及真实游戏正常退出验收。2026-11-19 的最终前置包仅验收黑魂1重制版和黑魂2原罪学者，不把结果套用到 DS3。实验与历史记录保存在工作区 `D:/code-github/vortex-extensions/HeyboxSoulsLoader/`。

尚无可上线的前置包及 Heybox Mod id；当前沿用手动提示。适配器的构建、类型检查和安装夹具通过，只证明安装侧合同。
