# Cyberpunk 2077 对齐清单

对照源：`D:/code-github/vortex-extensions/game-cyberpunk2077`，main
`a934850337c649002c9b3120cad26000b593157b`（0.13.3）。仅 Steam；GOG/Epic 暂缓。

## 安装与路径边界

- Heybox installer 第二参数是解包 staging，不是 Vortex 的安装目录/下载文件名。
- copy.source 保留压缩包原始相对路径；copy.destination 是相对 ModType 目标目录的路径；不能混用 staging、游戏绝对路径和下载名称。
- 保留 Heybox VFS 的冲突、启停、回滚及 FOMOD 最终指令模型。
- REDmod 自有状态保留在 `H2077/`，不占用 Vortex 的 `V2077/`；游戏读取的 Archive 顺序仍是 `archive/pc/mod/modlist.txt`。
- SDK 新能力必须是可选、通用的上下文或生命周期 hook；游戏路径与文件操作由 adapter 实现。

## 本轮逐项处理

- [x] REDmod：修正 CLI 参数、增量部署、仅重排时清理 modded 缓存，收集 stdout/stderr 并报告实际失败原因。
- [x] 六个框架：Audioware/TweakXL/ArchiveXL/Input Loader/Mod Settings/AMM 按特征文件识别并复制实际发行内容，不绑定旧版本清单。保留 redscript、RED4ext、CyberCAT 的结构检查和危险 DLL 防护。
- [x] redscript：支持 `r6/storages`，正确保留 hints/storages，避免 loose script 重定位这些旁文件。
- [x] 包身份：通过 SDK 安装上下文提供稳定名称/版本，修复把 `r6` 等游戏目录当 Mod 名的情况，不从 staging 路径猜名。
- [x] Archive 顺序：复用通用排序 UI，提供独立 provider，匹配部署后的直接 `.archive` 文件及现有 modlist；默认 ASCII 顺序移除 modlist，新文件插入字母邻位。
- [x] REDmod metadata：核对空版本、customSounds 声明和实际 sounds 文件一致性。
- [x] REDmod DLC：将前置要求收窄到已安装 REDmod 场景，核对生命周期中检查时机。
- [x] 框架所需空目录与纯 mod_skip sounds 空目录：确认 SDK 可表达的通用机制，不能用占位文件代替。
- [x] 评估手动 Archive ↔ REDmod 转换：仅纯 Archive，显式操作，通过受管理部署修改机制实现；记录接口缺口。
- [x] 评估 REDlauncher/CyberCAT/手动 REDdeploy 入口、启动前部署、可信游戏版本接口；超出当前两仓边界的能力明确报告。
- [x] 评估 fallback 的“不再询问”设置，核对现有作用域存储能力。
- [x] 定向回归、adapter lint/test/build、涉及 SDK 的 typecheck/test 和 Mod Manager 构建；记录实际验证范围。

## 已有能力（本轮保留）

- [x] REDmod 顺序持久化、禁用保留位置，启用/禁用/卸载/重配置后自动部署。
- [x] FOMOD 最终选择后提取 REDmod metadata，不把未选择组件加入顺序。
- [x] 非空 REDmod 部署成功后按现有通用 Steam 启动项协调器追加 `-modded`，保留用户参数，不自动移除。
- [x] 通用 Steam 前置弹窗、重新检查能力。
- [x] RED4ext 保留 DLL 防护、受保护 JSON/XML 覆盖确认、未知有效文件整包 fallback。

## 本轮结论与剩余能力

- [x] FOMOD 路由后的绝对目标使用 SDK 提供的游戏根做边界校验，再投影为游戏相对 REDmod 路径；未知/其它游戏根的绝对路径仍拒绝。
- [x] 空目录在现有 afterEnable hook 创建，输入共享目录会保留；不引入占位文件或更改 VFS 回滚模型。
- [x] fallback 保留逐包确认：现有 adapter API 未提供带用户/游戏作用域的持久偏好和设置入口，本轮不以模块变量模拟“不再询问”。
- [ ] 手动 Archive ↔ REDmod 转换：尚未实现。现有 managed mutation 仅有 moveDeployment/adoptDeployment/setModMetadata，逐项执行失败会停止，但没有整批事务回滚；也不提供受管理的 generate/delete 或持久 staging 变换。完整转换需要先补通用原子转换事务及 Mod 操作入口，不能只移动游戏文件，否则下次启用仍会按原包重新安装。
- [ ] REDlauncher/CyberCAT 工具入口：尚未实现。SDK 的 registerAction 仅兼容注册且不物化 UI，缺少通用工具声明、存在性刷新、启动端口和可见入口。CyberCAT 仍按已有规则安装并提示手动启动。
- [ ] 启动前检查/部署：尚未实现。当前 SDK 没有注册到真实游戏启动拥有方的 start hook；该拥有方位于这两个仓库外，不能用 ModManager 页面的按钮冒充启动拦截。
- [ ] 可信游戏版本：尚未实现。现有 SDK 没有可用的可执行文件产品版本接口，本轮不使用 Steam build ID 或无依据的默认版本。
- [x] 手动 REDdeploy 已复用通用顺序弹窗的失败重试、deployRedmods action；不另建进程调用链。

2077 manifest 的 api_version 提升为 1.18.0，必须配套本轮 Mod Manager SDK；类型依赖仍兼容已发布的 heybox-mod-api 1.17.0，通过可选结构声明衔接。

## 验证记录

构建与单测仅证明源码/制品验证，不代表真实游戏加载或 REDmod 编译已验收。未经用户要求不提交、推送或发布。

- Cyberpunk2077：lint / test（106 项，另有 FOMOD utils 10 项）/ build:extension 通过。
- Mod Manager SDK：typecheck / 全量 test（135 项）通过；含真实临时 staging、VFS 覆盖恢复、安装身份与 hook 上下文回归。
- Mod Manager：test（197 项）/ 排序多 provider 定向组件测试（3 项）/ surfaces check / build 通过。
- Mod Manager 的 Project typecheck 通过，但脚本另报告 xml2js、winreg 两处依赖声明缺失（不属于 Project 判据）；未为本轮改动扩展修复依赖范围。
- 未执行真实宿主 activate、游戏加载、REDmod CLI 真机编译或 Steam DLC 安装验收。
