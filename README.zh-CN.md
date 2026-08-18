# Data 初步分析 Skill

这是一个面向 CSV 与 Excel 文件的只读数据分析 Skill V1。它负责运行环境检查、文件与表头检查、字段类型识别、数据质量与描述性统计、基础可视化、Pearson/Spearman 相关性分析，并生成可以离线浏览的多页面 HTML 报告。

## 主要能力

- 支持 `.csv`、`.xlsx`、`.xls`，并可只读方式读取 `.xlsm` 数据；不会执行宏。
- CSV 可检测常见编码与分隔符。
- 自动判断候选表头；无表头时支持 `X1、X2、...`。
- 识别 numeric、categorical、datetime、boolean、text、id_like、constant、unknown 等字段类型。
- 统计缺失值、重复行、无穷值、常量列、高基数类别列、IQR 潜在异常值等。
- 自动绘制适合字段类型的图，并支持用户指定两两字段关系图。
- 支持 Pearson 与 Spearman 相关矩阵、随机最多 10 个数值特征相关图和阈值相关网络图。
- 将“Python 计算事实、AI 解释事实、HTML 展示结果”分离，降低幻觉和业务误判风险。
- 最终报告不依赖 Skill 内部路径，可整体复制后离线打开。

## 安装前检查

建议 Python 3.10+。先执行：

```bash
python scripts/check_environment.py
```

如果缺少依赖，不应自动安装。确认用户允许后，再执行：

```bash
python -m pip install -r assets/requirements.txt
```

`.xls` 旧格式额外需要 `xlrd`，只有处理该格式时才需要安装。

## 检查文件

```bash
python scripts/inspect_file.py /path/to/data.csv
```

Excel：

```bash
python scripts/inspect_file.py /path/to/data.xlsx
```

如果存在多个 Sheet，脚本会列出 Sheet，并要求明确选择，而不是静默使用第一个。

无表头：

```bash
python scripts/inspect_file.py data.csv --header none
```

指定第 3 行（零基索引 2）为表头：

```bash
python scripts/inspect_file.py data.xlsx --sheet Sheet1 --header 2
```

## 执行分析

```bash
python scripts/run_analysis.py data.csv --output report-work
```

指定 Excel Sheet：

```bash
python scripts/run_analysis.py data.xlsx --sheet Sheet1 --output report-work
```

指定两两字段关系图：

```bash
python scripts/run_analysis.py data.csv \
  --pair Temperature Pressure \
  --pair Category Temperature \
  --output report-work
```

修改相关性参数：

```bash
python scripts/run_analysis.py data.csv \
  --correlation-method spearman \
  --correlation-threshold 0.8 \
  --output report-work
```

分析结果主要保存在：

```text
report-work/analysis_result.json
report-work/assets/images/
```

## AI 评价内容

推荐由 AI 读取：

```text
analysis_result.json
references/interpretation_guidelines.md
```

并生成：

```text
analysis_commentary.json
```

评价分为：

- Fact：直接数据事实；
- Observation：有数据支撑的描述性观察；
- Attention：需要进一步检查的问题；
- Limitation：当前数据不能确认的结论。

不得把相关性解释成因果，不猜测字段单位、正常范围或业务故障。

## 生成 HTML 报告

```bash
python scripts/generate_report.py \
  --analysis report-work/analysis_result.json \
  --commentary report-work/analysis_commentary.json \
  --output final-report
```

如果没有提供 `analysis_commentary.json`，脚本会生成非常保守的事实型兜底说明，不会自行编造业务结论。

最终目录类似：

```text
final-report/
├── index.html
├── html/
├── css/
├── js/
└── assets/
    ├── images/
    └── data/
```

直接用浏览器打开 `index.html` 即可，无需 CDN 或网络连接。

如果要严格按照 Skill 默认流程，把 `index.html`、`html/`、`css/`、`js/`、`assets/` 直接生成到用户源文件所在目录，可将 `--output` 指向源文件的父目录。生成器只检查这些由报告管理的目标路径是否冲突，不会因为目录中存在原始 CSV/Excel 或其他无关文件就拒绝生成。

## 作为 Skill 发布

发布时请保留整个目录结构，尤其是根目录下的 `SKILL.md`。不要只发布 `SKILL.md`，因为运行还依赖 `scripts/`、`references/`、`assets/` 和模板文件。

不同 AI/Agent 平台对 Skill 的上传或安装方式可能不同，因此可以直接发布完整文件夹，或者发布本项目生成的 ZIP 压缩包。

## 安全策略

- 默认只读，不修改原 CSV/Excel。
- 不执行 Excel 宏。
- 用户文本进入 HTML 前会经过模板自动转义。
- 图片文件名使用内部安全 ID，不直接把字段名当作文件名。
- 不使用外部 CDN。
- 输出目录非空时默认拒绝覆盖；只有明确允许后才使用 `--force`。

## V1 暂不包含

自动清洗、机器学习、PCA、聚类、复杂异常检测、NLP、因果分析、数据库、实时流、多文件 Join 等功能不属于第一版范围。

## Smoke Test

```bash
python tests/smoke_test.py
```

测试会在临时目录创建 CSV/Excel 文件，执行检查、分析、可视化、相关性和 HTML 报告生成，然后自动清理测试文件。

## License

当前压缩包未替你选择开源许可证。正式公开发布前，请根据你的发布目的添加合适的许可证文件。
