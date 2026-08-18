# 数据初始分析技能（Data Initial Analysis Skill）

English description: [`README.md`](README.md)。

一个可发布的 V2 技能，用于对 CSV 和 Excel 文件做初始分析：校验运行环境与输入文件、推断表头与语义列类型、画像数据质量（带严重度分级与混入内容检测）、计算描述性统计、导出有界绘图数据、计算 Pearson/Spearman 相关系数，并生成**图表完全由浏览器端 vanilla JS/SVG 交互渲染**的离线 HTML 报告 —— 无静态图片、无 CDN、无网络请求。

## V2 新增 / 变更能力

- **动态图表取代静态图**：不再用 matplotlib 生成 SVG 图片。Python 只导出有界、可复现的绘图数据（`data.series`），直方图、箱线图、类别条形图、散点图、列联表、热力图、网络图全部由浏览器端 JS 实时绘制，支持悬停查看精确数值。
- **相关网络图 + 阈值滑动器**：相关系数页面提供 Pearson/Spearman 切换与阈值滑块。拖动滑块会**实时增删网络连线**（按 |r| 过滤）；悬停节点高亮其连接。
- **特征对分析默认开启**：Relationships 页面始终可用。任选两个特征即可绘图，图表类型随语义类型自适应（数值×数值 → 散点并实时计算 Pearson/Spearman；数值×类别 → 分组箱线图；类别×类别 → 列联热表；时间×数值 → 时间序列），散点还支持按类别着色。
- **CSS/JS 分文件组织**：`css/` 拆为 base/layout/components/charts/print 五个文件；`js/` 拆为 core、charts/（每种图一个模块）、pages/（每页一个脚本）与 main.js。
- **界面设计借鉴 frontend-design 技能**：采用 "科学蓝图实验室"（Blueprint Lab）风格 —— 深墨蓝底、坐标纸网格、等宽字体为主 + 衬线大标题、琥珀/青/红点缀、分段加载动效与悬停反馈。
- **混入内容检测（stray content）**：`profile_data.py` 会自动把"高缺失 + 结构异常内容"（长标题文本、数字/文本混杂、孤立小样本岛）的列标记为 `stray_content_candidate`（critical），例如混入数据表的练习题解答列。质量页用图标（✓/!/✕）按严重度展示每一列的健康状态。
- **特征筛选**：被标记为 critical（全缺失 / 混入内容 / 极高缺失）或常量/近常量的列会**自动从分析集中排除**——分布图、特征对分析、相关矩阵默认都不再使用这些列（如 iris 的 X7/X8/X9）；被排除列可在界面中展开查看，但默认不参与分析。
- **亮色 / 暗色主题切换**：顶栏按钮一键切换，偏好本地持久化。
- **中英文切换**：顶栏按钮切换界面语言（界面文案、图表动态标签、质量标记均可翻译；AI 注释、列名、数值保持原文）。
- **Distributions 数值特征分析**：折线图占整行、KDE + 水平箱线图；图表类型复选框固定宽度紧邻特征选择器；图表淡入动画防闪烁；重分类为数值的特征可被选择（含被排除的常量列）；Field statistics 动态渲染并高亮当前选中特征。
- **Relationships 交互增强**："color by" 复选框引入第三个分类维度且始终单图展示 —— 未勾选时：数值×数值→散点、数值×类别→分组箱线、类别×类别→交叉频数热力图；勾选后：着色散点图、单图双分组箱线图、单图堆叠条形图。
- **Data Quality 增强**：列健康由前端渲染并响应类型覆盖 —— 干净的非类别列隐藏、有标记列展示、每个类别列在其健康行下方内嵌 TOP-5 柱状图 + 环形饼图（其余归为"其他"）；缺失表仅列出真正存在缺失值的列。
- **类型覆盖（treat as，位于 Dataset Overview）**：概览页的列表面板为每一列提供"视为"下拉（数值 / 类别 / 时间 / 文本 / 忽略）；修改持久化，并在 Distributions（图表类型与分组）、Relationships（组合类型）与 Correlations（重分类为数值的特征以客户端计算相关性加入分析）中全局生效。
- **主题闪烁修复**：主题在首帧绘制前即以内联脚本应用，切换页面不再出现暗色→亮色闪烁。
- **Correlations 默认 10 个、上限 20 个特征**：特征选择器默认勾选前 10 个可用数值特征，最多 20 个（计数器强制上限）。
- **质量指标图标化**：数据质量页的指标卡、列健康行、flag 徽章全部配内联 SVG 图标。

## 支持输入

- `.csv`
- `.xlsx`
- `.xls`（需要 xlrd 等兼容引擎）
- `.xlsm` 仅按数据读取，绝不执行宏

## 环境

Python 3.10+；必需包见 `assets/requirements.txt`。`matplotlib` 与 `networkx` 在 V2 中**不再是必需项**（图表由前端渲染）；仅读取旧版 `.xls` 需要 `xlrd`。

安装前先检查：

```bash
python scripts/check_environment.py
```

缺包时先向用户报告并征得许可，禁止自动安装。

## 快速开始

```bash
# 检查文件（多 Sheet 时会要求选择）
python scripts/inspect_file.py data.xlsx

# 运行分析（产出 analysis_result.json：事实统计 + 绘图数据）
python scripts/run_analysis.py data.xlsx --sheet Sheet1 --output report-work

# 指定 Relationships 页面默认特征对
python scripts/run_analysis.py data.csv --pair Temperature Pressure --output report-work

# AI 注释（可选项，见 interpretation_guidelines.md）
# 生成 analysis_commentary.json

# 生成离线 HTML 报告
python scripts/generate_report.py \
  --analysis report-work/analysis_result.json \
  --commentary report-work/analysis_commentary.json \
  --output final-report
```

打开 `final-report/index.html` 即可，全部资源本地化、完全离线。

## 目录结构

```text
csv_excel_analysis_skill/
├── SKILL.md
├── README.md
├── README.zh-CN.md
├── references/       # 各环节规则文档
├── scripts/          # check_environment / inspect_file / profile_data / visualize / correlation / run_analysis / generate_report
├── assets/
│   ├── requirements.txt
│   ├── default_config.json
│   ├── favicon.ico   # 报告默认图标
│   ├── templates/    # 6 个页面模板 + base
│   ├── css/          # base / layout / components / charts / print
│   └── js/           # core / i18n / charts/ / pages/ / main
└── tests/smoke_test.py
```

## 安全与限制

- 源文件只读；宏绝不执行。
- 用户文本在渲染前做 HTML 转义；写入 `js/data.js` 的 JSON 将 `<` 转义，防止 `</script>` 逃逸。
- 不做自动清洗、ML 建模、因果推断、NLP、多表合并；超大文件绘图数据按配置采样（统计仍全量）。
- 已有报告文件默认不覆盖，需显式 `--force`。

运行冒烟测试：

```bash
python tests/smoke_test.py
```
