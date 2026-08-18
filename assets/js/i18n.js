/* i18n.js — light bilingual dictionary (en/zh) + language helpers.
 * Interface chrome is translated; AI commentary, column names, and numeric
 * values are intentionally left as-is. */
(function (global) {
  'use strict';
  const DA = global.DA;

  const DICT = {
    en: {
      'brand.title': 'Data Audit',
      'brand.sub': 'initial analysis',
      'nav.summary': 'Summary', 'nav.overview': 'Overview', 'nav.quality': 'Quality',
      'nav.distributions': 'Distributions', 'nav.relationships': 'Relationships', 'nav.correlations': 'Correlations',
      'footer.note1': 'Generated from read-only analysis. Source data was not modified.',
      'footer.note2': 'Interactive report · vanilla JS/SVG · no external resources',
      'hero.eyebrow': 'Initial data audit',
      'hero.meta.sheet': 'Sheet', 'hero.meta.header': 'Header mode', 'hero.meta.semantic': 'Semantic columns',

      'metric.rows': 'Rows', 'metric.columns': 'Columns', 'metric.missing': 'Missing',
      'metric.duplicates': 'Duplicate rows', 'metric.critical': 'Critical flags',
      'metric.missingCells': 'Missing cells', 'metric.duplicateRows': 'Duplicate rows',
      'metric.warnings': 'Warnings', 'metric.clean': 'Clean columns',
      'metric.memory': 'Memory', 'metric.emptyCols': 'Empty columns', 'metric.pairs': 'pairs',
      'metric.pearson': 'pearson r', 'metric.spearman': 'spearman ρ',

      'index.findings': 'Key findings', 'index.notes': 'Analysis notes', 'index.explore': 'Explore the report',
      'index.limitations': 'Limitations',
      'explore.overview': 'Schema, types & dataset composition',
      'explore.quality': 'Missingness, duplicates & problem columns',
      'explore.distributions': 'Interactive univariate charts',
      'explore.relationships': 'Pick any two features & compare',
      'explore.correlations': 'Heatmaps & threshold-adjustable network',

      'overview.title': 'Dataset Overview',
      'overview.note': 'Schema, semantic types, and per-column inference from a read-only pass.',
      'overview.overrideNote': "Change a feature's type here — the override applies to Distributions, Relationships, and Correlations.",
      'overview.treatAs': 'Treat as',
      'overview.types': 'Semantic types', 'overview.columns': 'Columns', 'overview.ai': 'AI commentary',
      'th.column': 'Column', 'th.type': 'Type', 'th.confidence': 'Confidence', 'th.reason': 'Reason', 'th.flags': 'Flags',

      'quality.title': 'Data Quality',
      'quality.note': 'Columns are flagged rather than repaired. Critical flags indicate all-missing or stray-content columns that should be reviewed before any downstream use.',
      'quality.health': 'Column health',
      'quality.health.note': 'Icons summarize each column:',
      'quality.needsReview': 'needs review', 'quality.noFlags': 'no flags',
      'quality.missingness': 'Missingness by column',
      'quality.noMissing': 'No column has missing values.',
      'quality.categoryCharts': 'Category distributions',
      'quality.categoryCharts.note': 'Top-5 categories per categorical column; the remainder are grouped as "Other".',
      'quality.other': 'Other',
      'quality.topK': 'top categories',
      'quality.pie': 'share',
      'quality.noCat': 'No categorical features to chart.',
      'quality.noFlagsAtAll': 'No columns to show in Column health.',
      'quality.health.note2': 'clean non-categorical columns are hidden',
      'quality.ai': 'AI commentary',

      'dist.title': 'Distributions',
      'dist.note': 'Select features to chart. Hover any element for exact values; the underlying data is bounded by the configured sampling limits.',
      'dist.select': 'Feature to analyze',
      'dist.changeType': 'change types in Overview',
      'dist.auto': 'auto',
      'type.numeric': 'numeric', 'type.categorical': 'categorical', 'type.datetime': 'datetime',
      'type.text': 'text', 'type.ignore': 'ignored',
      'dist.selectAll': 'All', 'dist.clear': 'None',
      'dist.showFlagged': 'show flagged columns', 'dist.excludedNote': 'Flagged columns are excluded from analysis.',
      'dist.charts': 'Charts', 'dist.stats': 'Field statistics',
      'dist.chartTypes': 'Chart types', 'dist.noCharts': 'Tick at least one chart type.',
      'dist.noNumeric': 'No numeric features available.',
      'dist.distribution': 'distribution', 'dist.box': 'box plot', 'dist.topCategories': 'top categories',
      'chart.line': 'line chart', 'chart.density': 'density', 'chart.timeSeries': 'category counts over time',
      'chart.qq': 'Q-Q plot', 'chart.autocorr': 'autocorrelation (ACF)',
      'dist.notChartable': 'not chartable', 'dist.textField': 'text-like field',
      'dist.noSelection': 'Select at least one feature to chart.',
      'dist.ignored': 'This feature is marked as ignored and excluded from charts.',
      'dist.sampled': 'sampled {n} of {m} rows', 'dist.rows': '{n} rows',

      'rel.title': 'Pairwise Relationships',
      'rel.note': 'Feature-pair analysis is enabled by default. Choose any two columns — the chart adapts to their semantic types and re-renders instantly.',
      'rel.explorer': 'Feature explorer', 'rel.colorBy': 'color by', 'rel.guide': 'Pair chart guide',
      'rel.guide1': 'numeric × numeric — scatter with live Pearson / Spearman. Use color by to shade points by a category column.',
      'rel.guide2': 'numeric × categorical — grouped box plots (top categories).',
      'rel.guide3': 'categorical × categorical — contingency heat table.',
      'rel.guide4': 'datetime × numeric — time series line.',
      'rel.selectHint': 'Select two different features to compare.',
      'rel.ai': 'AI commentary',

      'corr.title': 'Correlation Analysis',
      'corr.note': 'Correlation describes association, not causation. Drag the threshold slider to filter network edges by |r| in real time.',
      'corr.select': 'Numeric features to include',
      'corr.select.note': 'default {d} · max {m} selected',
      'corr.features': 'Features used', 'corr.network': 'Correlation network',
      'corr.network.note': 'Nodes are numeric features; an edge exists when |correlation| ≥ threshold. Edge color: teal = positive, red = negative. Hover a node to highlight its connections.',
      'corr.heatmap': 'Correlation matrix',
      'corr.heatmap.note': 'Cell color encodes sign and magnitude (teal = +1, red = −1). Hover a cell for the exact coefficient.',
      'corr.random': 'Reproducible random subset',
      'corr.threshold': 'Threshold |r| ≥',
      'corr.count': '{e} edge(s) · {n} node(s) · |r| ≥ {t}',
      'corr.noNumeric': 'No usable numeric features were available for correlation analysis.',
      'corr.bounded': 'The full usable numeric feature set exceeded the configured display limit; the matrix was bounded.',

      'level.fact': 'Fact', 'level.observation': 'Observation', 'level.attention': 'Attention', 'level.limitation': 'Limitation',
      'level.info': 'Info', 'level.warning': 'Warning', 'level.critical': 'Critical', 'level.clean': 'clean',

      'flag.all_missing': 'all missing', 'flag.constant': 'constant', 'flag.near_constant': 'near constant',
      'flag.high_missing': 'high missing', 'flag.has_missing': 'has missing', 'flag.high_cardinality': 'high cardinality',
      'flag.id_like': 'id-like', 'flag.infinity': 'infinity', 'flag.stray_content_candidate': 'stray content',

      'btn.theme': 'Switch to {t} mode', 'btn.lang': '中文',
      'days': 'date', 'count': 'count',
    },
    zh: {
      'brand.title': '数据审计',
      'brand.sub': '初始分析',
      'nav.summary': '摘要', 'nav.overview': '概览', 'nav.quality': '质量',
      'nav.distributions': '分布', 'nav.relationships': '关系', 'nav.correlations': '相关',
      'footer.note1': '由只读分析生成。源数据未被修改。',
      'footer.note2': '交互式报告 · 原生 JS/SVG · 无外部资源',
      'hero.eyebrow': '初始数据审计',
      'hero.meta.sheet': '工作表', 'hero.meta.header': '表头模式', 'hero.meta.semantic': '语义列',

      'metric.rows': '行数', 'metric.columns': '列数', 'metric.missing': '缺失率',
      'metric.duplicates': '重复行', 'metric.critical': '严重标记',
      'metric.missingCells': '缺失单元格', 'metric.duplicateRows': '重复行',
      'metric.warnings': '警告', 'metric.clean': '干净列',
      'metric.memory': '内存', 'metric.emptyCols': '空列', 'metric.pairs': '样本对',
      'metric.pearson': '皮尔逊 r', 'metric.spearman': '斯皮尔曼 ρ',

      'index.findings': '关键发现', 'index.notes': '分析说明', 'index.explore': '浏览报告',
      'index.limitations': '局限性',
      'explore.overview': '表结构、类型与数据组成',
      'explore.quality': '缺失、重复与问题列',
      'explore.distributions': '交互式单变量图表',
      'explore.relationships': '任选两个特征对比',
      'explore.correlations': '热力图与阈值可调网络图',

      'overview.title': '数据集概览',
      'overview.note': '基于只读扫描的表结构、语义类型与逐列推断。',
      'overview.overrideNote': '在此修改特征类型 —— 覆盖将应用于分布、关系与相关分析。',
      'overview.treatAs': '视为',
      'overview.types': '语义类型', 'overview.columns': '列', 'overview.ai': 'AI 注释',
      'th.column': '列', 'th.type': '类型', 'th.confidence': '置信度', 'th.reason': '依据', 'th.flags': '标记',

      'quality.title': '数据质量',
      'quality.note': '仅标记、不修复。严重标记表示全缺失或混入内容列，任何下游使用前都应审查。',
      'quality.health': '列健康状况',
      'quality.health.note': '图标概括每列状态：',
      'quality.needsReview': '需审查', 'quality.noFlags': '无标记',
      'quality.missingness': '按列缺失情况',
      'quality.noMissing': '没有列存在缺失值。',
      'quality.categoryCharts': '类别分布',
      'quality.categoryCharts.note': '每个类别列展示前 5 个类别；其余归为“其他”。',
      'quality.other': '其他',
      'quality.topK': 'TOP 类别',
      'quality.pie': '占比',
      'quality.noCat': '没有可绘图的类别特征。',
      'quality.noFlagsAtAll': '列健康中没有可显示的列。',
      'quality.health.note2': '干净的非类别列已隐藏',
      'quality.ai': 'AI 注释',

      'dist.title': '分布',
      'dist.note': '选择要绘图的特征。悬停任意元素可查看精确数值；底层数据受配置的采样上限约束。',
      'dist.select': '要分析的特征',
      'dist.changeType': '在概览页修改类型',
      'dist.auto': '自动',
      'type.numeric': '数值', 'type.categorical': '类别', 'type.datetime': '时间',
      'type.text': '文本', 'type.ignore': '忽略',
      'dist.selectAll': '全选', 'dist.clear': '清空',
      'dist.showFlagged': '显示被标记列', 'dist.excludedNote': '被标记列已从分析中排除。',
      'dist.charts': '图表', 'dist.stats': '字段统计',
      'dist.chartTypes': '图表类型', 'dist.noCharts': '请至少勾选一种图表类型。',
      'dist.noNumeric': '没有可用的数值特征。',
      'dist.distribution': '分布', 'dist.box': '箱线图', 'dist.topCategories': 'TOP 类别',
      'chart.line': '折线图', 'chart.density': '密度图', 'chart.timeSeries': '类别随时间计数',
      'chart.qq': 'Q-Q 图', 'chart.autocorr': '自相关图 (ACF)',
      'dist.notChartable': '不可绘图', 'dist.textField': '文本类字段',
      'dist.noSelection': '请至少选择一个特征进行绘图。',
      'dist.ignored': '该特征被标记为忽略，已排除在图表之外。',
      'dist.sampled': '已采样 {n}/{m} 行', 'dist.rows': '{n} 行',

      'rel.title': '两两关系',
      'rel.note': '特征对分析默认开启。任选两列，图表随语义类型自适应并即时重绘。',
      'rel.explorer': '特征探索器', 'rel.colorBy': '按类别着色', 'rel.guide': '配对图表指南',
      'rel.guide1': '数值 × 数值 —— 散点图，实时计算皮尔逊 / 斯皮尔曼系数。可用"按类别着色"按类别列着色。',
      'rel.guide2': '数值 × 类别 —— 分组箱线图（TOP 类别）。',
      'rel.guide3': '类别 × 类别 —— 列联热表。',
      'rel.guide4': '时间 × 数值 —— 时间序列折线。',
      'rel.selectHint': '请选择两个不同的特征进行比较。',
      'rel.ai': 'AI 注释',

      'corr.title': '相关分析',
      'corr.note': '相关描述关联而非因果。拖动阈值滑块可按 |r| 实时过滤网络连线。',
      'corr.select': '选择要纳入的数值特征',
      'corr.select.note': '默认 {d} 个 · 最多 {m} 个',
      'corr.features': '使用特征', 'corr.network': '相关网络图',
      'corr.network.note': '节点为数值特征；当 |相关| ≥ 阈值时存在连线。连线颜色：青色 = 正相关，红色 = 负相关。悬停节点高亮其连接。',
      'corr.heatmap': '相关矩阵',
      'corr.heatmap.note': '单元格颜色编码符号与强度（青 = +1，红 = −1）。悬停单元格查看精确系数。',
      'corr.random': '可复现随机子集',
      'corr.threshold': '阈值 |r| ≥',
      'corr.count': '{e} 条边 · {n} 个节点 · |r| ≥ {t}',
      'corr.noNumeric': '没有可用于相关分析的数值特征。',
      'corr.bounded': '可用数值特征超过配置显示上限，矩阵已裁剪。',

      'level.fact': '事实', 'level.observation': '观察', 'level.attention': '注意', 'level.limitation': '局限',
      'level.info': '信息', 'level.warning': '警告', 'level.critical': '严重', 'level.clean': '干净',

      'flag.all_missing': '全缺失', 'flag.constant': '常量', 'flag.near_constant': '近常量',
      'flag.high_missing': '高缺失', 'flag.has_missing': '有缺失', 'flag.high_cardinality': '高基数',
      'flag.id_like': '类ID', 'flag.infinity': '无穷值', 'flag.stray_content_candidate': '混入内容',

      'btn.theme': '切换到{t}模式', 'btn.lang': 'English',
      'days': '日期', 'count': '计数',
    },
  };

  DA.i18n = {
    dict: DICT,
    lang: 'en',
    init() {
      let saved = 'en';
      try { saved = localStorage.getItem('da-lang') || 'en'; } catch (e) { /* ignore */ }
      this.set(saved);
    },
    set(lang) {
      this.lang = DICT[lang] ? lang : 'en';
      try { localStorage.setItem('da-lang', this.lang); } catch (e) { /* ignore */ }
      document.documentElement.lang = this.lang;
      document.dispatchEvent(new CustomEvent('da-lang-change', { detail: { lang: this.lang } }));
    },
    t(key, vars) {
      const table = DICT[this.lang] || DICT.en;
      let text = table[key] !== undefined ? table[key] : (DICT.en[key] !== undefined ? DICT.en[key] : key);
      if (vars) {
        for (const k in vars) text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      }
      return text;
    },
    applyDom(root) {
      (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = this.t(el.getAttribute('data-i18n'));
      });
    },
    // translate a flag/level name for badges
    flag(name) { return this.t('flag.' + name); },
    level(name) { return this.t('level.' + name.toLowerCase()); },
  };

  DA.t = function (key, vars) { return DA.i18n.t(key, vars); };
  DA.flag = function (name) { return DA.i18n.flag(name); };
  DA.level = function (name) { return DA.i18n.level(name); };
})(window);
