# Cyberpunk 2077 Extension TODO

本清单记录当前 extension 与 `cyberpunk2077_ext_redux-0.12.1` 的剩余差异，供后续逐项实现和验收。

## 当前前提

- [x] FOMOD 视为已经完成，不再列入本清单。
- [x] 当前只支持 Steam；GOG 和 Epic 暂缓，不纳入当前差异修复范围。
- [x] 保留 Heybox VFS 的安装、冲突检查、部署和回滚模型，不照搬 Vortex 内部架构。
- [x] 常见 Mod 类型安装主干已覆盖：CET、RED4ext、redscript、Archive/ArchiveXL、TweakXL、Audioware、ASI、AMM、CyberScript、REDmod 和 ReShade。

## P0：REDmod Load Order

- [x] 提供可编辑的 REDmod 加载顺序。
- [x] 按当前 Heybox 用户及 appid 作用域持久化加载顺序。
- [x] 禁用 REDmod 后保留位置，再次启用时恢复。
- [x] 生成 `V2077/modlist.txt` 时严格使用用户配置顺序。
- [x] 处理新增、删除、重命名及失效 REDmod 条目。
- [x] 明确多类型 Mod 中 REDmod 部分参与排序的规则。
- [x] 补充排序、持久化、禁用恢复及部署结果测试。

- [x] FOMOD 可选 REDmod 在最终选择后提取 metadata，重配置时同步增删排序条目且不生成幽灵条目。

## P1：启动与外部工具集成

- [x] 首次成功部署非空 REDmod 后，为所有缺少参数的本地 Steam 用户保留原启动项并追加 `-modded`；取消后下次部署重试，且永不自动删除该参数。
- [ ] 评估并接入 REDlauncher 工具入口。
- [ ] 评估并接入手动 REDdeploy 操作或工具入口。
- [ ] 为 CyberCAT 提供可启动的工具入口，而不只是安装后通知。
- [ ] 部署后按需刷新外部工具可用状态。
- [ ] 如果 Mod SDK 尚无工具注册或启动参数能力，停止实现并报告 SDK 缺口，不在 extension 内绕过。

## P2：安装器行为与覆盖

- [x] 复核 INI/ReShade 路径与原版行为，并建立独立 fixture 测试。
- [ ] 复核 fallback installer 的确认策略，决定是否需要“以后不再询问”设置。
- [ ] 继续为其他专用安装器增加独立 fixture，避免只依赖聚合逻辑测试。

> Nexus 0.12.1 中 TweakDB 和 LUT 安装器已被注释且明确不可安装，因此不作为原版对齐缺口。

## P3：游戏信息

- [ ] 暴露可信的 Cyberpunk 2077 游戏版本，供兼容性检查使用。
- [ ] 不使用 Steam build ID 冒充游戏语义版本。
- [ ] 如果 Mod SDK 缺少可信版本 API，记录并报告 SDK 缺口。

## P4：设置与状态管理

- [ ] 为 Cyberpunk 专属设置建立清晰、独立的状态模型。
- [ ] 接入 fallback installer 提示策略开关（若确认需要）。
- [ ] 确保设置作用域与 profile/游戏实例语义一致。
- [ ] 不把 Cyberpunk 专属状态散落在通用 ModManager store 中。

## P5：测试与回归

- [ ] 继续将核心安装器拆分为按类型组织的 fixture 测试。
- [x] 覆盖 REDmod 生命周期：启用、禁用、卸载、重新排序和部署失败。
- [x] 覆盖受保护 RED4ext DLL。
- [x] 覆盖受保护 JSON/XML 目标路径的安装确认与取消（路径级保护，不读取或比较游戏内现有文件内容）。
- [x] 覆盖专用安装器遇到未知文件时的整包 fallback。
- [x] 覆盖多类型 Mod 与 REDmod 部署的组合场景。
- [x] 保持普通非 FOMOD 安装 pipeline 不回归。
- [x] 每轮完成 extension lint、typecheck、unit test 和 build。

## 暂缓项目

- 传统 Archive Mod 自动转换为 REDmod。
- GOG 和 Epic 商店支持。
- REDmod DLC 的 Steam 安装引导。

## 有意保留的差异（不作为 TODO）

- 使用 Heybox 的显式 mod type、attribute 和 VFS 生命周期，不复制 Vortex 的 profile/deployment 内部实现。
- REDmod 在启用、禁用、卸载后自动重新部署。
- 保留核心包完整性检查、RED4ext 保留 DLL 防护、配置覆盖确认和 REDmod 结构校验。
- 专用映射遇到无法识别的有效文件时整体进入 fallback，避免静默漏装。

## 实施规则

- 每次只处理一个主题，完成后同时更新本清单和对应测试。
- 开始某项前先复核 `cyberpunk2077_ext_redux-0.12.1` 的真实行为，再映射到 Heybox 架构。
- 发现 Mod SDK 尚未支持的能力时，不在 extension 内私自模拟；记录所需 API、调用链和阻塞范围并向用户报告。
- 新实现继续按领域拆分文件和目录，不集中到单个 TypeScript 文件。
