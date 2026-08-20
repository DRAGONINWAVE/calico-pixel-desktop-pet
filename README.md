# 长毛三花猫像素桌宠（Windows / Electron）

这是一个可打包为 Windows `.exe` 的透明像素桌宠项目。猫咪采用 64×64 像素精灵帧、透明无边框置顶窗口与独立状态机，并以 3 倍整数像素缩放显示为约 192×192 px；默认毛色为白底、橘色与黑色色块组成的长毛三花，左眼金黄色、右眼蓝色。项目已经附带一张 **118 帧**的基础可运行 Sprite Sheet，并将动作、帧序和替换约定写入 [状态机说明](docs/STATE_MACHINE.md)。

Electron 的 `BrowserWindow` 保持透明、无边框与置顶，窗口仅在当前显示器的工作区内移动，因此猫咪会停在任务栏上方。项目使用 `contextIsolation` 和受限的 `contextBridge` 预加载接口，避免将通用 IPC 通道直接暴露给渲染页面。[1]

## 已实现功能

| 分类 | 实现内容 |
| --- | --- |
| 像素角色 | 长毛三花基础形态；左金黄、右蓝色异瞳；118 帧、8 列 Sprite Sheet；所有帧透明背景、64×64 px、3 倍整数显示（约 192×192 px） |
| 待机动作 | 站立呼吸、坐下、趴睡呼吸、哈欠、伸懒腰、舔爪、理毛、挠耳、甩尾 |
| 移动动作 | 自动走路、预留跑步帧、双击跳跃、拖拽时四脚悬空挣扎 |
| 鼠标互动 | 单击撒娇蹭一蹭并显示“喵~”；双击开心跳跃并冒爱心；长按翻肚皮；悬停抬头看鼠标；**待机时双眼会实时追踪屏幕鼠标方向** |
| 安静陪伴 | 默认启用：不自动散步、不随机做动作、不弹启动气泡、不在 5 分钟后主动求关注；可在右键菜单关闭以恢复活跃模式 |
| 头顶系统监测 | 像素风任务管理器对话框；采用放大字体与更宽间距；每 1.5 秒刷新 CPU 使用率、RAM 已用/总量、系统运行时长与系统盘已用/总容量；Windows 下显示进程数量，进程与磁盘查询至多每 10 秒更新一次以减少开销 |
| 道具互动 | 右键投喂小鱼干；右键丢毛线球后观察并扑咬 |
| 窗口物理 | 自由拖拽；松手后以递增速度落至当前显示器任务栏上方的工作区底面；触到左右边缘会坐下、掉头 |
| 系统菜单 | 默认关闭的脚步声、喵叫声独立开关；安静陪伴模式；三种演示皮肤滤镜；鱼干、毛线球、开机自启动和退出 |
| Windows 打包 | 已配置 `electron-builder --win portable`，输出单文件便携 `.exe`；带项目自制像素猫 `.ico` 图标 |

> 项目中的“灰白”和“橘白”属于**皮肤扩展示范**：当前通过滤镜改变现有精灵观感。若需要严谨的独立毛色，请按状态机文件的帧映射提供完整替代 Sprite Sheet。

## 目录结构

```text
calico-pixel-desktop-pet/
├─ assets/
│  ├─ calico-sprites.png       # 512×960、118 帧透明 Sprite Sheet
│  ├─ calico-icon.ico          # Windows 图标
│  ├─ sprite-map.json          # 帧号与 FPS 映射，供美术替换时参考
│  └─ sprite-map.js            # 运行时映射
├─ docs/
│  └─ STATE_MACHINE.md         # 状态机、触发器与精灵帧表
├─ src/
│  ├─ main.js                  # 窗口、工作区边缘、菜单和自启动逻辑
│  ├─ preload.js               # 最小化的主/渲染进程桥接接口
│  ├─ renderer.js              # 精灵播放、状态机、互动、物理与合成音效
│  ├─ index.html
│  └─ style.css
├─ tools/
│  └─ generate_sprites.py      # 可重生基础像素图集与图标的脚本
├─ package.json
└─ package-lock.json
```

## 在 Windows 上本地运行

请先安装当前 LTS 版 Node.js。随后在项目根目录打开 PowerShell，按以下顺序执行：

```powershell
npm install
npm start
```

窗口启动后，猫咪本体保持约 192×192 px，并以更高的透明窗口承载头顶的“系统监测”对话框。面板会以低频刷新显示本机 CPU、内存、系统盘使用量、进程与运行时间；指标字体、标题和进度条均已放大，对话气泡和爱心特效也同步放大。它不发声、不弹通知，也不会影响默认安静待机。它不会自行弹话、求关注或来回散步；但在待机、看向鼠标、行走和张望动作中，**双眼会以不超过 1 个源像素的位移平滑追踪全屏鼠标方向**。你可右键猫咪，取消勾选“安静陪伴模式”以恢复自动活动。首次与猫咪进行点击、拖拽或菜单操作后，浏览器音频上下文才会允许播放合成脚步声和喵叫声；若电脑静音或浏览器环境拒绝自动播放，动画和互动仍可正常工作。

## 打包为 Windows `.exe`

项目的 `package.json` 已将 `win.target` 配置为 `portable`。electron-builder 的 Windows target 列表包含 `portable`，该格式会生成无需常规安装的单文件 `.exe`；构建配置也支持通过 `package.json` 顶层的 `build` 字段维护。[2] [3]

在项目根目录执行：

```powershell
npm install
npm run build:win
```

成功后，文件会出现在：

```text
release\\三花猫桌宠-1.6.0-Windows-x64.exe
```

该文件可直接复制至 Windows 10 或 Windows 11 电脑后双击运行。首次分发给其他电脑时，如未配置 Authenticode 代码签名证书，Windows 可能显示来源提示；这是未签名自定义应用的常见分发限制。若要面向公众发布，建议为发行管线配置自己的代码签名证书。electron-builder 的 Windows 配置文档说明，代码签名可用于让 Windows 对发布者和文件完整性进行校验。[2]

## 开发与美术替换

| 需求 | 操作 |
| --- | --- |
| 重新生成占位像素素材 | 执行 `npm run sprites`；需系统已安装 Python 3 与 Pillow |
| 替换为画师精灵图 | 覆盖 `assets/calico-sprites.png`，保留 64×64 格与 8 列排布；详见 [状态机说明](docs/STATE_MACHINE.md) |
| 改变动作帧数或顺序 | 同步修改 `assets/sprite-map.json`、`assets/sprite-map.js` 与 `tools/generate_sprites.py` |
| 增加新道具 | 在 `main.js` 菜单中发送新命令，并在 `renderer.js` 的 `installMenuCommands()` 中绑定动画链 |
| 改为安装器发行 | 将 `package.json` 中的 `portable` target 改为 `nsis` 后重新执行 `npm run build:win` |

## 验证结果

项目已完成以下本地静态与构建检查：

| 检查项 | 结果 |
| --- | --- |
| `node --check src/main.js src/preload.js src/renderer.js` | 通过 |
| `python3 -m py_compile tools/generate_sprites.py` | 通过 |
| 118 帧 Sprite Sheet / 透明 PNG / ICO 图标生成 | 通过 |
| `npm install` 安装依赖审计 | 通过，未报告已知漏洞 |
| `npm run build:win` | 已成功生成 x64 Windows 便携版 `.exe` |

> 构建产物可在当前交付的 `release/` 目录中找到。由于构建环境不是 Windows 图形桌面，会话内未进行鼠标实机操作验收；请在目标 Windows 10/11 设备上按“本地运行”步骤进行一次交互验收。

## 参考资料

[1] [Electron — Context Isolation](https://electronjs.org/docs/latest/tutorial/context-isolation)

[2] [electron-builder — Windows configuration and targets](https://www.electron.build/docs/win/)

[3] [electron-builder — Configuration](https://www.electron.build/docs/configuration/)
