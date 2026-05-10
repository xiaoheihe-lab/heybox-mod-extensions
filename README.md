# heybox-mod-extensions

小黑盒 Mod 管理器游戏扩展仓库。每个 extension 为小黑盒 Mod 管理器提供一款游戏的模组管理能力（游戏发现、Mod 类型注册、安装器等）。

## 项目结构

```
heybox-mod-extensions/
├── extensions/           # 游戏扩展（每个子目录对应一款游戏）
│   └── <GameName>/
│       ├── index.ts      # 扩展入口，定义游戏 spec、mod types、installers
│       ├── package.json  # 扩展元信息，包含 appid 和构建脚本
│       └── tsconfig.json
├── internal/
│   └── build/            # 构建工具（esbuild 打包）
│       ├── build.mjs     # 构建脚本
│       ├── package.json
│       └── tsconfig.base.json
├── dist/                 # 最终发布制品（仅由 CI 维护，禁止手动修改）
│   └── <appid>.cjs
├── package.json          # 根 workspace 配置
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## 技术栈

- **Runtime:** Node.js 22+
- **包管理:** pnpm (workspace monorepo)
- **语言:** TypeScript
- **构建工具:** esbuild（输出 CommonJS 格式）
- **CI/CD:** GitHub Actions

---

## 开发指南

### 环境准备

```bash
# 确保使用 pnpm 10.x+
corepack enable
pnpm install
```

### 创建新 extension

```bash
pnpm create --dirname <GameName> --appid <steamAppId>
```

**参数说明：**

| 参数 | 类型 | 要求 | 示例 |
|------|------|------|------|
| `--dirname` | 字符串 | 推荐**大驼峰**（PascalCase），与游戏正式名称一致 | `SlayTheSpire2`、`BaldursGate3` |
| `--appid` | 字符串 | Steam App ID，可在 Steam 商店页面 URL 或 [SteamDB](https://steamdb.info/) 获取 | `2868840`、`1086940` |

**命名约定：**
- `dirname` 使用大驼峰格式（每个单词首字母大写，无空格无下划线）：`SlayTheSpire2`、`EldenRing`、`BlackMythWukong`
- `appid` 为 Steam 平台的游戏唯一数字 ID
- `package.json` 的 `name` 字段会自动转为 kebab-case：`SlayTheSpire2` → `@heybox-mod-extensions/slay-the-spire2`

**示例：**

```bash
pnpm create --dirname SlayTheSpire2 --appid 2868840
```

成功后将生成以下文件结构：

```
extensions/SlayTheSpire2/
├── index.ts          # 扩展入口，编写游戏 spec、mod types、installers
├── package.json      # 扩展元信息（自动填好 name 和 appid）
└── tsconfig.json     # TypeScript 配置
```

若创建时未提供完整参数，脚本会自动提示逐项输入：

```bash
pnpm create --dirname MyGame
# 终端提示 → 请输入 appid:
```

### 本地开发

```bash
cd extensions/<GameName>

# 在 extension 目录下本地构建验证
pnpm build

# 产物输出到 extensions/<GameName>/dist/<appid>.js（已被 .gitignore，不会误提交）
```

### 提交 PR

1. 确保只在**一个** `extensions/<name>/` 目录下做了修改
2. 不要在 PR 中包含 `dist/`、`internal/`、根配置文件等其他文件
3. CI 会自动检查合规性，不合规的 PR 会被拒绝

---

## 开发规范

### PR 提交限制

所有社区贡献者提交的 Pull Request 必须符合以下规则（由 CI 自动检查）：

> **一次 PR 只能修改单个 `extensions/<name>/` 目录下的文件。**

这意味着不得在 PR 中同时修改：
- `dist/` 目录 — 该目录由 CI 机器人自动维护
- `internal/` 目录 — 构建工具由仓库管理员维护
- 根目录配置文件 (`package.json`、`pnpm-*.yaml` 等)
- 多个 extension 目录

### 构建流程

项目采用**两层 dist** 架构：

| 层级 | 路径 | 谁生成 | 触发时机 |
|------|------|--------|----------|
| 本地构建 | `extensions/<name>/dist/<appid>.js` | 开发者本地 | `pnpm build` |
| 发布制品 | `dist/<appid>.cjs` | CI 机器人 | 合并到 master 后 |

#### 本地开发

```bash
# 安装依赖
pnpm install

# 在 extension 目录下本地构建验证
cd extensions/<GameName>
pnpm build

# 产物输出到 extensions/<GameName>/dist/<appid>.js（已被 .gitignore，不会误提交）
```

#### CI 自动构建

当 PR 被合并到 `master` 后，GitHub Actions 自动执行：

1. 检测本次合并中变更的 extension
2. 对变更的 extension 执行增量构建
3. 将产物 `dist/<appid>.cjs` 提交回 `master` 分支
