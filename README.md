# heybox-mod-extensions

小黑盒 Mod 管理器游戏扩展仓库。每个 extension 为小黑盒 Mod 管理器提供一款游戏的模组管理能力（游戏发现、Mod 类型注册、安装器等）。

## 项目结构

```
heybox-mod-extensions/
├── extensions/           # 游戏扩展（每个子目录对应一款游戏）
│   └── <GameName>/
│       ├── index.ts      # 扩展入口，定义游戏 spec、mod types、installers
│       ├── manifest.json # 扩展清单，包含 appid，可选 api_version
│       ├── package.json  # 扩展包元信息和构建脚本
│       └── tsconfig.json
├── internal/
│   └── build/            # 构建工具（esbuild 打包）
│       ├── build.mjs     # 构建脚本
│       ├── package.json
│       └── tsconfig.base.json
├── dist/                 # 最终发布制品（仅由 CI 维护，禁止手动修改）
│   └── <GameName>/
│       ├── index.cjs
│       └── manifest.json
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
| `--dirname` | 字符串 | 必须**大驼峰**（PascalCase），仅包含英文字母和数字，且不能与已有 extension 重复 | `SlayTheSpire2`、`BaldursGate3` |
| `--appid` | 字符串 | 必须为正整数，且不能与已有 extension 重复；可在 Steam 商店页面 URL 或 [SteamDB](https://steamdb.info/) 获取 | `2868840`、`1086940` |

**命名约定：**
- `dirname` 使用大驼峰格式（每个单词首字母大写，无空格无下划线），并且在 `extensions/` 下唯一：`SlayTheSpire2`、`EldenRing`、`BlackMythWukong`
- `appid` 为 Steam 平台的游戏唯一数字 ID，仓库内不能重复
- `package.json` 的 `name` 字段会自动转为 kebab-case：`SlayTheSpire2` → `@heybox-mod-extensions/slay-the-spire2`
- `appid` 只写入 `manifest.json`，不要写入 `package.json`

**示例：**

```bash
pnpm create --dirname SlayTheSpire2 --appid 2868840
```

成功后将生成以下文件结构：

```
extensions/SlayTheSpire2/
├── index.ts          # 扩展入口，编写游戏 spec、mod types、installers
├── manifest.json     # 扩展清单（自动填好 appid）
├── package.json      # 扩展包元信息（自动填好 name）
└── tsconfig.json     # TypeScript 配置
```

若创建时未提供完整参数，脚本会自动提示逐项输入：

```bash
pnpm create --dirname MyGame
# 终端提示 → 请输入 appid:
```

### manifest.json 属性说明

每个 extension 必须包含 `manifest.json`，构建脚本会读取它并将标准化后的清单写入构建产物目录。

`manifest.json` 用来描述扩展与客户端的绑定关系：`appid` 负责把扩展关联到指定游戏，`api_version` 负责声明扩展运行所需的小黑盒 Mod API 最低版本。客户端应当能运行 `api_version` 小于或等于自身支持版本的扩展；旧客户端不保证能运行声明了更新 `api_version` 的扩展。

源文件最小格式：

```json
{
  "appid": "2868840"
}
```

构建产物中的完整格式：

```json
{
  "appid": "2868840",
  "api_version": "1.6.0-alpha1"
}
```

字段说明：

| 字段 | 要求 | 说明 |
|------|------|------|
| `appid` | 必填 | Steam App ID，必须是正整数，仓库内不能重复。`appid` 只存放在 `manifest.json` 中。 |
| `api_version` | 可选 | 扩展依赖的小黑盒 Mod API 最低版本。通常不需要手写，构建时会自动补全。 |

除 `appid` 和 `api_version` 之外，`manifest.json` 可以包含自定义字段。构建脚本会将这些字段原样透传到产物的 `manifest.json` 中。

`api_version` 生成规则：

1. 如果源 `manifest.json` 中已经写了 `api_version`，构建产物会使用这个值。
2. 如果没有写，构建脚本会读取该 extension 的 `package.json`，依次查找 `dependencies`、`devDependencies`、`peerDependencies` 中的 `heybox-mod-api` 版本字符串。
3. `api_version` 必须是精确 semver 版本，例如 `1.6.0-alpha1`；不能使用 `^1.6.0-alpha1`、`~1.6.0`、`>=1.6.0`、`latest` 等范围或标签。
4. 如果既没有 `manifest.json.api_version`，也没有声明 `heybox-mod-api` 依赖，构建会停止并报错。

### 本地开发

```bash
cd extensions/<GameName>

# 在 extension 目录下本地构建验证
pnpm build

# 产物输出到 extensions/<GameName>/dist/<GameName>/index.cjs 和 manifest.json（已被 .gitignore，不会误提交）
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
| 本地构建 | `extensions/<name>/dist/<name>/index.cjs` + `manifest.json` | 开发者本地 | `pnpm build` |
| 发布制品 | `dist/<name>/index.cjs` + `manifest.json` | CI 机器人 | 合并到 main 后 |

#### 本地开发

```bash
# 安装依赖
pnpm install

# 在 extension 目录下本地构建验证
cd extensions/<GameName>
pnpm build

# 产物输出到 extensions/<GameName>/dist/<GameName>/index.cjs 和 manifest.json（已被 .gitignore，不会误提交）
```

#### CI 自动构建

当 PR 被合并到 `main` 后，GitHub Actions 自动执行：

1. 检测本次合并中变更的 extension
2. 对变更的 extension 执行增量构建
3. 将产物 `dist/<name>/index.cjs` 和 `dist/<name>/manifest.json` 提交回 `main` 分支
