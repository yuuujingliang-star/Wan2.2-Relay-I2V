const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak, Footer, Header
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: "1a56a0" };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "1a56a0" })], spacing: { before: 360, after: 120 } });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "2c7bb6" })], spacing: { before: 240, after: 80 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "333333" })], spacing: { before: 180, after: 60 } });
}
function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 22, ...opts })], spacing: { before: 60, after: 60 } });
}
function pb(text) {
  return new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 22, bold: true })], spacing: { before: 60, after: 60 } });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
    spacing: { before: 40, after: 40 }
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
    spacing: { before: 40, after: 40 }
  });
}
function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "222222" })],
    spacing: { before: 40, after: 40 },
    indent: { left: 720 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR }
  });
}
function warn(text) {
  return new Paragraph({
    children: [new TextRun({ text: "⚠ " + text, font: "Arial", size: 22, color: "B22222", bold: true })],
    spacing: { before: 80, after: 80 },
    indent: { left: 360 }
  });
}
function note(text) {
  return new Paragraph({
    children: [new TextRun({ text: "✓ " + text, font: "Arial", size: 22, color: "1a7a1a" })],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 }
  });
}
function sep() {
  return new Paragraph({ children: [new TextRun({ text: "" })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } }, spacing: { before: 120, after: 120 } });
}
function blank() {
  return new Paragraph({ children: [new TextRun("")], spacing: { before: 60, after: 60 } });
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const makeCell = (text, isHeader = false) => new TableCell({
    borders,
    width: { size: colWidths[0], type: WidthType.DXA },
    shading: isHeader ? { fill: "D0E4F5", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: isHeader })] })]
  });

  const allRows = [
    new TableRow({ children: headers.map((h, i) => new TableCell({
      borders: headerBorders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: "1a56a0", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 20, bold: true, color: "FFFFFF" })] })]
    })) }),
    ...rows.map(row => new TableRow({
      children: row.map((cell, i) => new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 20 })] })]
      }))
    }))
  ];
  return new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: colWidths, rows: allRows });
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.BULLET, text: "-", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.DECIMAL, text: "%1.%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
      { reference: "tasks", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "Task %1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial", color: "1a56a0" }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2c7bb6" }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial", color: "333333" }, paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    children: [

      // ─── TITLE PAGE ───
      blank(), blank(),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prompt Relay I2V 迁移", font: "Arial", size: 56, bold: true, color: "1a56a0" })], spacing: { before: 480, after: 120 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "架构设计报告", font: "Arial", size: 40, bold: true, color: "2c7bb6" })], spacing: { before: 0, after: 240 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "支持 Image-to-Video 路径的 Temporal Control 方案", font: "Arial", size: 24, color: "555555" })], spacing: { before: 0, after: 480 } }),
      sep(),
      blank(), blank(), blank(),

      // ─── SECTION 1: 总体结论 ───
      h1("1. 总体结论"),
      p("本报告针对 Prompt Relay 项目，设计将现有 T2V 路径的 Temporal Cross-Attention Routing 机制迁移至 I2V（WanI2V）路径的完整架构方案。"),
      blank(),
      pb("核心结论（先结论，再细节）："),
      bullet("推荐架构：方案 B —— 抽出公共模块 wan/utils/prompt_relay.py，T2V 和 I2V 均调用该模块。"),
      bullet("model.py / attention.py 无需修改，底层 attention routing 可直接复用。"),
      bullet("I2V 改造的核心集中在 generate.py 和 wan/image2video.py 两个文件。"),
      bullet("最高风险点：I2V 的 tokens_per_frame 必须从主流程真实 lat_h / lat_w 计算，绝对不能从外部 size 参数倒推。"),
      bullet("raw_seq_len（未补齐）与 max_seq_len（sp 补齐后）必须严格区分，q_token_idx 的 frame 映射只能基于 raw_seq_len。"),
      bullet("工程量评估：中等。新增/修改约 150~250 行，新增 1 个文件，修改 3~4 个文件，不需要重训，不影响 checkpoint，不影响显存，不影响推理速度。"),
      blank(),

      sep(),
      // ─── SECTION 2: 推荐架构 ───
      h1("2. 推荐架构：方案 B"),
      h2("2.1 三种方案对比"),
      blank(),
      makeTable(
        ["方案", "描述", "推荐", "原因"],
        [
          ["方案 A", "在 image2video.py 中复制 T2V 的 _prepare_prompts()", "❌ 不推荐", "代码重复，T2V/I2V/TI2V 三路维护困难，改一处遗漏另一处"],
          ["方案 B", "抽出 wan/utils/prompt_relay.py，T2V 和 I2V 都调用", "✅ 推荐", "单一真相源，逻辑统一，接口清晰，可安全扩展到 TI2V"],
          ["方案 C", "逻辑放入 model.py 或 attention.py", "❌ 不推荐", "违反关注点分离，污染底层模块，增加 checkpoint 兼容风险"],
        ],
        [1400, 3200, 1000, 3760]
      ),
      blank(),
      h2("2.2 为什么推荐方案 B"),
      bullet("_prepare_prompts 是纯粹的「给定 latent shape，构造 attention routing 索引」逻辑，与任务无关（T2V 和 I2V 的 attention 机制相同）。"),
      bullet("公共模块的函数签名明确接收 latent_frames / lat_h / lat_w / patch_size，不接收 size，从接口层面禁止 I2V 错误地从外部尺寸倒推 latent shape。"),
      bullet("方案 A 的复制粘贴会导致未来如果论文迭代（例如修改 window / sigma 公式），需要同步修改多处，极易遗漏。"),
      bullet("方案 C 将推理逻辑下沉到模型层，会让 model.py 感知「任务类型」，破坏 checkpoint 兼容性，且影响所有使用该模型的下游任务。"),
      h2("2.3 对 T2V / I2V / TI2V 维护的影响"),
      bullet("T2V：重构后调用 prompt_relay.maybe_prepare_prompt_relay(...)，行为不变，需要回归测试验证。"),
      bullet("I2V：新增调用 prompt_relay.maybe_prepare_prompt_relay(...)，新增 prompt_filepath 参数透传。"),
      bullet("TI2V：若后续需支持，只需在 textimage2video.py 中新增同样的调用，无需改动公共模块。"),
      h2("2.4 checkpoint / 显存 / 速度"),
      note("不影响 checkpoint：公共模块纯 Python 逻辑，不引入任何可训练参数。"),
      note("不影响显存：q_token_idx 是稀疏索引，内存开销极小（O(num_segments * tokens_per_frame)）。"),
      note("不影响推理速度：Prompt Relay 论文已证明「no additional computational overhead」，chunked_softmax_attention 已有实现。"),

      sep(),
      // ─── SECTION 3: T2V 链路复盘 ───
      h1("3. 当前 T2V 链路复盘"),
      h2("3.1 已确认链路（基于代码实测）"),
      p("通过阅读 generate.py 和 text2video.py，T2V 的 Prompt Relay 调用链如下："),
      blank(),
      code("generate.py"),
      code("  --prompt_filepath 解析 → args.prompt_filepath"),
      code("  → wan_t2v.generate(..., prompt_filepath=args.prompt_filepath)"),
      blank(),
      code("text2video.py :: WanT2V.generate(...)"),
      code("  → if prompt_filepath is not None:"),
      code("      load JSON → global_prompt / local_prompts / segment_lengths"),
      code("      → self._prepare_prompts(global_prompt, local_prompts, segment_lengths, frame_num, size)"),
      code("      → 返回 (cross_attn_q_token_idx, full_prompt)"),
      blank(),
      code("text2video.py :: WanT2V._prepare_prompts(...)"),
      code("  → 从 size 计算 h_lat / w_lat / tokens_per_frame"),
      code("  → tokenizer 定位 local_prompt 在 full_prompt 中的 token span"),
      code("  → build_q_token_idx() → 构造 payload list（window, sigma, midpoint, tokens_per_frame, local_token_idx）"),
      blank(),
      code("text2video.py :: WanT2V.generate(...)"),
      code("  → arg_c = { 'context': ..., 'seq_len': seq_len, 'cross_attn_q_token_idx': ... }"),
      code("  → model(latent_model_input, t=timestep, **arg_c)"),
      blank(),
      code("wan/modules/model.py :: WanModel.forward(...)"),
      code("  → 将 cross_attn_q_token_idx 继续透传到各 block"),
      blank(),
      code("wan/modules/attention.py :: WanCrossAttention.forward(...)"),
      code("  → 如果 q_token_idx is not None: 调用 chunked_softmax_attention(...)"),
      code("  → chunked_softmax_attention 对 logits 执行 logits = logits - penalty"),
      blank(),
      h2("3.2 T2V 中 tokens_per_frame 的现有计算方式（存在隐患）"),
      warn("现有 _prepare_prompts 接收 size=(width, height)，然后从 size 推导 h_lat / w_lat。"),
      warn("对 T2V 而言，target_shape 的 lat_h / lat_w 确实等于 size[1] // vae_stride[1] 和 size[0] // vae_stride[2]，因此结果一致。"),
      warn("但 I2V 的 lat_h / lat_w 是从输入图像实际分辨率推导的，不能用 size 参数替代。这是 I2V 迁移的最高风险点。"),
      note("迁移后，T2V 的 _prepare_prompts 也应该重构为接收 lat_h / lat_w，保持接口一致性（向后兼容，外部不变）。"),

      sep(),
      // ─── SECTION 4: I2V 迁移设计 ───
      h1("4. I2V 迁移设计"),
      h2("4.1 I2V 完整调用链"),
      blank(),
      code("generate.py"),
      code("  → wan_i2v.generate("),
      code("      args.prompt, img,"),
      code("      max_area=MAX_AREA_CONFIGS[args.size],"),
      code("      frame_num=args.frame_num,"),
      code("      ..."),
      code("      prompt_filepath=args.prompt_filepath   # 新增透传"),
      code("  )"),
      blank(),
      code("wan/image2video.py :: WanI2V.generate(...)"),
      code("  # --- 主流程先执行 ---"),
      code("  latent_frames = (frame_num - 1) // self.vae_stride[0] + 1"),
      code("  # lat_h / lat_w 必须来自主流程真实计算，见 4.2"),
      code("  lat_h = <主流程真实计算值>"),
      code("  lat_w = <主流程真实计算值>"),
      code(""),
      code("  # --- Prompt Relay 在此处介入 ---"),
      code("  cross_attn_q_token_idx, input_prompt = prompt_relay.maybe_prepare_prompt_relay("),
      code("      prompt_filepath=prompt_filepath,"),
      code("      input_prompt=input_prompt,"),
      code("      tokenizer=self.text_encoder.tokenizer,"),
      code("      latent_frames=latent_frames,"),
      code("      lat_h=lat_h,"),
      code("      lat_w=lat_w,"),
      code("      patch_size=self.patch_size,"),
      code("  )"),
      blank(),
      code("  → 调用链下游与 T2V 完全相同："),
      code("  arg_c = { 'context': ..., 'seq_len': seq_len,"),
      code("            'cross_attn_q_token_idx': cross_attn_q_token_idx }"),
      code("  → model(..., **arg_c)"),
      code("  → WanModel.forward → WanCrossAttention.forward → chunked_softmax_attention"),
      blank(),
      h2("4.2 I2V 中 lat_h / lat_w 的正确获取方式"),
      warn("必须从 image2video.py 主流程真实生成用到的值获取，不能从 size 或 max_area 重新推导。"),
      p("需要 Codex 打开 wan/image2video.py，找到以下变量的实际赋值位置："),
      bullet("image preprocessing 之后的实际 target_shape 或等价变量"),
      bullet("通常为 target_shape = (z_dim, latent_frames, lat_h, lat_w) 形式"),
      bullet("lat_h 对应 target_shape[2]，lat_w 对应 target_shape[3]"),
      p("伪代码示意："),
      code("# 假设 image2video.py 中存在如下计算（Codex 需要核实实际变量名）："),
      code("target_shape = (self.vae.model.z_dim,"),
      code("                latent_frames,"),
      code("                image_h_resized // self.vae_stride[1],   # lat_h"),
      code("                image_w_resized // self.vae_stride[2])   # lat_w"),
      code("lat_h = target_shape[2]"),
      code("lat_w = target_shape[3]"),
      warn("如果 image2video.py 在不同分支用不同变量名，Codex 必须找到 latent 噪声 tensor 创建时的 shape，那里的 H/W 维度就是真实 lat_h / lat_w。"),
      h2("4.3 新增/修改参数一览"),
      blank(),
      makeTable(
        ["参数", "方向", "层级", "说明"],
        [
          ["prompt_filepath", "新增透传", "generate.py → WanI2V.generate", "已在 generate.py 存在，只需在 i2v 分支传入"],
          ["global_prompt", "内部变量", "image2video.py 内部", "从 JSON 解析，传入 maybe_prepare_prompt_relay"],
          ["local_prompts", "内部变量", "image2video.py 内部", "从 JSON 解析，传入 maybe_prepare_prompt_relay"],
          ["cross_attn_q_token_idx", "新增透传", "image2video.py → WanModel.forward", "由 maybe_prepare_prompt_relay 返回，放入 arg_c"],
          ["lat_h / lat_w", "内部变量", "image2video.py 内部", "从主流程真实 target_shape 提取，绝不从 size 推导"],
        ],
        [1600, 1400, 2200, 3200]
      ),

      sep(),
      // ─── SECTION 5: 公共模块设计 ───
      h1("5. 公共 Prompt Relay 模块设计"),
      h2("5.1 文件路径"),
      code("wan/utils/prompt_relay.py"),
      blank(),
      h2("5.2 函数设计"),
      blank(),
      h3("5.2.1 load_prompt_relay_json"),
      code("def load_prompt_relay_json(prompt_filepath: str) -> dict:"),
      code("    \"\"\""),
      code("    加载并校验 Prompt Relay JSON 文件。"),
      code("    输入：prompt_filepath (str) - JSON 文件路径"),
      code("    返回：dict，包含 global_prompt, local_prompts, 以及可选的 segment_lengths"),
      code("    错误：FileNotFoundError, json.JSONDecodeError, ValueError（缺少必要字段）"),
      code("    \"\"\""),
      blank(),
      h3("5.2.2 normalize_temporal_prompts"),
      code("def normalize_temporal_prompts("),
      code("    global_prompt: str,"),
      code("    local_prompts: list[str],"),
      code("    segment_lengths: list[int],"),
      code("    latent_frames: int,"),
      code(") -> tuple[str, list[tuple[int, int, list[str]]]]:"),
      code("    \"\"\""),
      code("    归一化时间段定义，返回 full_prompt 和 frame_intervals。"),
      code("    frame_intervals 格式：[(frame_start, frame_end, [local_prompt_str]), ...]"),
      code("    如果 segment_lengths 为空，均匀分割 latent_frames。"),
      code("    错误：如果 segment_lengths 之和超过 latent_frames，抛出 ValueError。"),
      code("    注意：不接收 size，不依赖 T2V 或 I2V 任何特定逻辑。"),
      code("    \"\"\""),
      blank(),
      h3("5.2.3 build_cross_attn_q_token_idx"),
      code("def build_cross_attn_q_token_idx("),
      code("    frame_intervals: list[tuple[int, int, list[str]]],"),
      code("    token_spans: dict[str, tuple[int, int]],"),
      code("    tokens_per_frame: int,"),
      code(") -> list[dict]:"),
      code("    \"\"\""),
      code("    构造 cross_attn_q_token_idx payload list。"),
      code("    每个 payload 包含：window, sigma, midpoint, tokens_per_frame, local_token_idx。"),
      code("    完全任务无关，T2V 和 I2V 均可使用。"),
      code("    \"\"\""),
      blank(),
      h3("5.2.4 sentence_to_token_indices（内部辅助，可暴露）"),
      code("def sentence_to_token_indices("),
      code("    tokenizer,"),
      code("    full_prompt: str,"),
      code("    subsentences: list[str],"),
      code(") -> dict[str, tuple[int, int]]:"),
      code("    \"\"\""),
      code("    定位各 local_prompt 在 full_prompt token 序列中的起止 index。"),
      code("    错误：如果子序列在全序列中找不到，抛出 ValueError（含明确 prompt 信息）。"),
      code("    \"\"\""),
      blank(),
      h3("5.2.5 validate_prompt_relay_sequence"),
      code("def validate_prompt_relay_sequence("),
      code("    cross_attn_q_token_idx: list[dict],"),
      code("    latent_frames: int,"),
      code("    lat_h: int,"),
      code("    lat_w: int,"),
      code("    patch_size: tuple,"),
      code(") -> None:"),
      code("    \"\"\""),
      code("    一致性校验："),
      code("    tokens_per_frame = (lat_h // patch_size[1]) * (lat_w // patch_size[2])"),
      code("    raw_seq_len = latent_frames * tokens_per_frame"),
      code("    expected = latent_frames * lat_h * lat_w // (patch_size[1] * patch_size[2])"),
      code("    assert raw_seq_len == expected"),
      code("    对每个 payload 校验 midpoint 在 [0, latent_frames) 内。"),
      code("    注意：使用 raw_seq_len，绝对不使用 max_seq_len（sp 补齐后的值）。"),
      code("    \"\"\""),
      blank(),
      h3("5.2.6 maybe_prepare_prompt_relay（顶层入口）"),
      code("def maybe_prepare_prompt_relay("),
      code("    prompt_filepath: str | None,"),
      code("    input_prompt: str,"),
      code("    tokenizer,"),
      code("    latent_frames: int,"),
      code("    lat_h: int,"),
      code("    lat_w: int,"),
      code("    patch_size: tuple,"),
      code(") -> tuple[list[dict] | None, str]:"),
      code("    \"\"\""),
      code("    统一入口。如果 prompt_filepath 为 None，返回 (None, input_prompt) 不做任何修改。"),
      code("    否则依次调用：load → normalize → token_indices → build → validate。"),
      code("    返回 (cross_attn_q_token_idx, full_prompt)。"),
      code("    T2V 和 I2V 都调用此函数。"),
      code("    \"\"\""),
      blank(),
      h2("5.3 接口设计原则"),
      warn("公共函数绝对不接收 size 参数。I2V 调用方必须传入主流程真实的 lat_h / lat_w。"),
      warn("公共函数不导入任何 wan.text2video 或 wan.image2video 模块，保持零依赖。"),
      note("所有错误信息必须包含具体数值，方便 debug（例如：'segment_lengths sum=25 exceeds latent_frames=21'）。"),

      sep(),
      // ─── SECTION 6: JSON 格式设计 ───
      h1("6. JSON 格式设计"),
      h2("6.1 推荐格式"),
      p("推荐：方案 1 —— image path 继续由 --image 参数传入，JSON 只放 prompt 相关字段。"),
      p("理由：image 路径属于生成控制参数，不属于 prompt 路由配置，混在 JSON 里会让 --image 和 JSON 产生冲突（以谁为准？）。"),
      blank(),
      code("{"),
      code("  \"global_prompt\": \"A cinematic sequence filmed in natural light.\","),
      code("  \"local_prompts\": ["),
      code("    \"A young woman sits alone at a cafe table, stirring her coffee slowly.\","),
      code("    \"She looks up and smiles as an old friend walks through the door.\","),
      code("    \"They embrace warmly, laughing and talking animatedly.\""),
      code("  ],"),
      code("  \"segment_lengths\": [7, 7, 7]"),
      code("}"),
      blank(),
      h2("6.2 字段说明"),
      blank(),
      makeTable(
        ["字段", "类型", "必须", "说明"],
        [
          ["global_prompt", "string", "是", "全局提示词，作用于整个视频，与所有 local_prompt 拼接后进入文本编码器"],
          ["local_prompts", "string[]", "是", "各时间段的局部提示词，按顺序与 segment_lengths 对应"],
          ["segment_lengths", "int[]", "否", "各段的 latent frame 数量，缺省时均匀分割 latent_frames"],
        ],
        [1600, 1200, 800, 5000]
      ),
      blank(),
      h2("6.3 segment_lengths 单位与约定"),
      bullet("单位：latent frame 数量（不是秒，不是像素帧数）。设计为 latent frame 是因为 Prompt Relay 的核心逻辑就在 latent 空间。"),
      bullet("如需用秒指定，调用方需要自行换算：latent_frames = ceil((seconds * fps - 1) / vae_stride[0]) + 1（需要 Codex 确认 vae_stride[0] 的实际值，当前代码中 T2V 使用的是 4）。"),
      bullet("不允许小数（latent frame 必须是整数）。"),
      bullet("segment_lengths 之和必须 <= latent_frames，否则 validate 报错。"),
      bullet("不要求时间段连续：允许有间隙（间隙内 token 不受 Prompt Relay routing 控制，仅受 global_prompt 影响）。"),
      bullet("不允许时间段重叠（同一 latent frame 不能同时属于两个 segment，否则 penalty 会冲突）。"),
      bullet("global_prompt 和 local_prompt 的组合方式：full_prompt = global_prompt + ''.join(local_prompts)，与 T2V 保持一致，进入同一个文本编码器调用。"),
      h2("6.4 与当前 T2V prompts.json 的兼容性"),
      note("格式与 T2V prompts.json 完全一致（均包含 global_prompt / local_prompts / segment_lengths），I2V JSON 无需新增字段。"),
      note("这意味着同一份 prompts.json 理论上可以同时用于 T2V 和 I2V（只要 segment_lengths 与对应的 latent_frames 匹配）。"),

      sep(),
      // ─── SECTION 7: tokens_per_frame / q_token_idx ───
      h1("7. tokens_per_frame 与 q_token_idx 详细设计"),
      h2("7.1 I2V 中的正确计算流程"),
      blank(),
      code("# Step 1: 计算 latent_frames（与 T2V 相同公式）"),
      code("latent_frames = (frame_num - 1) // self.vae_stride[0] + 1"),
      blank(),
      code("# Step 2: 从主流程真实 target_shape 提取 lat_h / lat_w"),
      code("# 【Codex 需要打开 image2video.py 找到 target_shape 的实际赋值】"),
      code("lat_h = target_shape[2]  # 真实值，来自图像 resize 后的 latent 高度"),
      code("lat_w = target_shape[3]  # 真实值，来自图像 resize 后的 latent 宽度"),
      blank(),
      code("# Step 3: 计算 tokens_per_frame"),
      code("tokens_per_frame = (lat_h // self.patch_size[1]) * (lat_w // self.patch_size[2])"),
      blank(),
      code("# Step 4: 计算 raw_seq_len（未补齐）"),
      code("raw_seq_len = latent_frames * tokens_per_frame"),
      blank(),
      code("# Step 5: 一致性校验（使用 raw_seq_len）"),
      code("expected_raw_seq_len = latent_frames * lat_h * lat_w // (self.patch_size[1] * self.patch_size[2])"),
      code("assert raw_seq_len == expected_raw_seq_len, ("),
      code("    f'raw_seq_len mismatch: {raw_seq_len} vs {expected_raw_seq_len}, '"),
      code("    f'lat_h={lat_h}, lat_w={lat_w}, latent_frames={latent_frames}'"),
      code(")"),
      blank(),
      h2("7.2 为什么绝对不能使用 max_seq_len"),
      warn("max_seq_len 是 sequence parallel 补齐（pad to sp_size 的整数倍）之后的长度。"),
      warn("seq_len = ceil(raw_seq_len / sp_size) * sp_size，当 raw_seq_len 不能被 sp_size 整除时，max_seq_len > raw_seq_len。"),
      warn("padding token 不对应任何真实的 latent frame。如果用 max_seq_len 计算 frame index，padding 部分的 token 会被错误地映射到某个帧，导致 penalty 计算错误。"),
      warn("q_token_idx 的 frame 映射公式为 f(i) = i // tokens_per_frame，此公式只对 i < raw_seq_len 有意义。"),
      blank(),
      h2("7.3 sequence parallel padding 对 q_token_idx 的影响"),
      bullet("padding token（index >= raw_seq_len）不属于任何 latent frame，不应被 Prompt Relay routing 控制。"),
      bullet("chunked_softmax_attention 在计算 penalty 时，需要对 padding token 的 penalty 设为 0（即不施加任何额外 penalty，让 attention mask 本身处理）。"),
      bullet("实现方式：在 penalty 计算前，对 q_token_idx >= raw_seq_len 的 token 跳过 penalty 计算，或者设 C(i,j) = 0。"),
      bullet("需要 Codex 检查 chunked_softmax_attention 现有实现，确认是否已经处理 padding token（当前 T2V 在 sp_size=1 时不存在 padding，因此可能没有 guard）。"),
      blank(),
      h2("7.4 建议安全检查伪代码"),
      blank(),
      code("# 在 maybe_prepare_prompt_relay 内部调用 validate 后，额外打印 debug 信息"),
      code("if logging.isEnabledFor(logging.DEBUG):"),
      code("    logging.debug("),
      code("        f'[PromptRelay] latent_frames={latent_frames}, lat_h={lat_h}, lat_w={lat_w}, '"),
      code("        f'tokens_per_frame={tokens_per_frame}, raw_seq_len={raw_seq_len}, '"),
      code("        f'num_segments={len(cross_attn_q_token_idx)}'"),
      code("    )"),
      blank(),
      code("# 在 chunked_softmax_attention 内部（如需修改）"),
      code("for payload in cross_attn_q_token_idx:"),
      code("    midpoint = payload['midpoint']"),
      code("    tokens_per_frame = payload['tokens_per_frame']"),
      code("    # 只对 raw token 范围内的 query 计算 penalty"),
      code("    q_frame_idx = q_idx // tokens_per_frame  # 当前 query token 的 latent frame index"),
      code("    if q_idx >= raw_seq_len:"),
      code("        continue  # padding token，跳过"),

      sep(),
      // ─── SECTION 8: 是否需要修改 model.py / attention.py ───
      h1("8. 是否需要修改 model.py / attention.py"),
      h2("8.1 判断结论"),
      blank(),
      makeTable(
        ["组件", "判断", "理由"],
        [
          ["WanModel.forward", "可能需要小改", "需要确认是否已支持 cross_attn_q_token_idx 参数透传到每个 cross-attn block（T2V 已接入，I2V 应复用相同 WanModel）"],
          ["WanCrossAttention.forward", "不需要修改", "T2V 已接入 q_token_idx 分支，I2V 复用同一 WanModel，不需要改 attention 层"],
          ["chunked_softmax_attention", "可能需要小改", "需要确认 padding token guard 是否存在，sp_size>1 时需要保证 padding token 不被错误 penalty"],
        ],
        [2200, 1600, 4600]
      ),
      blank(),
      h2("8.2 Codex 验证清单"),
      numbered("打开 wan/modules/model.py，搜索 cross_attn_q_token_idx，确认 WanModel.forward 已将其透传到每个 block 的 cross_attn 调用。"),
      numbered("打开 wan/modules/attention.py，搜索 q_token_idx，确认 WanCrossAttention.forward 已有「if q_token_idx is not None: chunked_softmax_attention(...)」分支。"),
      numbered("检查 chunked_softmax_attention 的实现，确认 q_idx 循环时是否有 raw_seq_len bound check。如果没有，且 sp_size > 1，需要补充 guard。"),
      numbered("确认 WanI2V 使用的是同一个 WanModel 类（而非 I2V 专属子类）。如果 I2V 使用不同的模型类，需要在该类中补充相同的透传逻辑。"),
      h2("8.3 T2V 中仅适配 T2V shape 的隐含假设"),
      p("需要 Codex 检查以下可能的隐含假设："),
      bullet("chunked_softmax_attention 内部是否 hardcode 了任何与 T2V 分辨率相关的常数？"),
      bullet("tokens_per_frame 是否在 payload 内部传递（当前代码已传递，见 text2video.py 第 263 行），还是在 attention 内部重新计算？"),
      bullet("如果 attention 内部重新计算 tokens_per_frame，则必须保证 I2V 传入的 lat_h / lat_w 参与计算。"),

      sep(),
      // ─── SECTION 9: 需要修改的文件表 ───
      h1("9. 需要修改的文件表"),
      blank(),
      makeTable(
        ["文件", "操作", "改动类型", "主要变更内容"],
        [
          ["wan/utils/prompt_relay.py", "新增", "新文件", "公共模块：load / normalize / build / validate / maybe_prepare"],
          ["generate.py", "修改", "小改（~5行）", "在 i2v 分支的 wan_i2v.generate(...) 调用中新增 prompt_filepath=args.prompt_filepath"],
          ["wan/image2video.py", "修改", "中改（~30~50行）", "在 generate 主流程中，lat_h/lat_w 计算后调用 prompt_relay.maybe_prepare_prompt_relay，并将结果放入 arg_c"],
          ["wan/text2video.py", "修改", "中改（重构）", "将 _prepare_prompts 的逻辑迁移至 prompt_relay.py，text2video.py 改为调用 prompt_relay.maybe_prepare_prompt_relay"],
          ["wan/modules/attention.py", "可能小改", "视情况", "如果 chunked_softmax_attention 缺少 padding token guard，补充约 5~10 行"],
          ["wan/modules/model.py", "可能小改", "视情况", "如果 cross_attn_q_token_idx 透传不完整，补充透传"],
          ["i2v_prompts.json", "新增", "示例文件", "I2V Prompt Relay 的 JSON 示例"],
          ["README.md", "修改", "文档", "新增 I2V 使用说明和命令示例"],
        ],
        [2400, 1000, 1200, 3800]
      ),
      blank(),
      p("新增文件数：2（prompt_relay.py + i2v_prompts.json）"),
      p("修改文件数：4~6（generate.py, image2video.py, text2video.py, 可能 attention.py, 可能 model.py, README.md）"),
      p("预计新增/修改行数：150~250 行"),

      sep(),
      // ─── SECTION 10: Codex 执行任务清单 ───
      h1("10. Codex 执行任务清单"),
      blank(),
      h2("Task 1：只读检查 T2V 链路"),
      bullet("目标：确认 T2V Prompt Relay 现有链路完整，理解各变量含义。"),
      bullet("涉及文件：generate.py, wan/text2video.py, wan/modules/model.py, wan/modules/attention.py"),
      bullet("具体操作：搜索 prompt_filepath / cross_attn_q_token_idx / q_token_idx / chunked_softmax_attention，追踪参数流。"),
      bullet("验收标准：能够画出完整调用链，确认 chunked_softmax_attention 已实现。"),
      bullet("Debug：如果找不到 chunked_softmax_attention，搜索 logits - penalty 或 logits = logits - C。"),
      blank(),
      h2("Task 2：新建 wan/utils/prompt_relay.py"),
      bullet("目标：创建公共模块，实现 5.2 中所有函数。"),
      bullet("涉及文件：wan/utils/prompt_relay.py（新建）"),
      bullet("具体操作：将 text2video.py 中 _prepare_prompts 的核心逻辑（sentence_to_token_indices, build_q_token_idx）迁移并重构，使函数签名接收 latent_frames / lat_h / lat_w / patch_size，不接收 size。"),
      bullet("验收标准：python -c 'from wan.utils.prompt_relay import maybe_prepare_prompt_relay' 无报错。"),
      bullet("Debug：检查 __init__.py 是否需要更新。"),
      blank(),
      h2("Task 3：重构 text2video.py，复用公共模块"),
      bullet("目标：T2V 改为调用 prompt_relay.maybe_prepare_prompt_relay，行为不变。"),
      bullet("涉及文件：wan/text2video.py"),
      bullet("具体操作：在 generate() 中，用 maybe_prepare_prompt_relay 替换原有的 JSON 读取 + _prepare_prompts 调用。注意：T2V 调用时需要从 size 计算 lat_h / lat_w，然后传入 maybe_prepare_prompt_relay（不是传 size）。"),
      bullet("验收标准：T2V 回归测试通过（Task 10）。"),
      bullet("Debug：对比重构前后 cross_attn_q_token_idx 的 payload 内容是否完全一致。"),
      blank(),
      h2("Task 4：修改 generate.py，为 I2V 透传 prompt_filepath"),
      bullet("目标：在 i2v 分支的 wan_i2v.generate(...) 调用中新增 prompt_filepath 参数。"),
      bullet("涉及文件：generate.py"),
      bullet("具体操作：找到 video = wan_i2v.generate(...) 调用（当前约第 550 行），新增 prompt_filepath=args.prompt_filepath。"),
      bullet("验收标准：python generate.py --task i2v-A14B ... --prompt_filepath i2v_prompts.json 不报 unexpected keyword argument 错误。"),
      bullet("Debug：确认 WanI2V.generate 函数签名已接收 prompt_filepath 参数（Task 5 负责此项）。"),
      blank(),
      h2("Task 5：修改 image2video.py，接入 Prompt Relay"),
      bullet("目标：在 WanI2V.generate 中，于真实 lat_h / lat_w 计算后，调用 maybe_prepare_prompt_relay。"),
      bullet("涉及文件：wan/image2video.py"),
      bullet("具体操作（详细）："),
      bullet("① 在函数签名中新增 prompt_filepath=None 参数。", 1),
      bullet("② 找到 target_shape 或等价的 latent shape 赋值处，提取 lat_h = target_shape[2], lat_w = target_shape[3]。", 1),
      bullet("③ 计算 latent_frames = (frame_num - 1) // self.vae_stride[0] + 1（确认 image2video.py 中是否已有此变量）。", 1),
      bullet("④ 在此之后立即调用 maybe_prepare_prompt_relay(...)，获得 (cross_attn_q_token_idx, input_prompt)。", 1),
      bullet("⑤ 将 cross_attn_q_token_idx 放入 arg_c（如果为 None 则不放，或放 None）。", 1),
      bullet("验收标准：运行 Task 11 最小样例。"),
      bullet("Debug：在 maybe_prepare_prompt_relay 调用前后各打印一行 DEBUG 日志，确认 lat_h / lat_w 值合理（例如 1280x720 输入应产生 lat_h=90, lat_w=160，具体取决于 vae_stride）。"),
      blank(),
      h2("Task 6：检查 model.py 和 attention.py 的 cross_attn_q_token_idx 透传"),
      bullet("目标：确认 WanModel 和 WanCrossAttention 已完整支持 I2V 路径。"),
      bullet("涉及文件：wan/modules/model.py, wan/modules/attention.py"),
      bullet("具体操作：验证 Task 1 中的只读检查结论，如有缺失则补充透传代码和 padding guard。"),
      bullet("验收标准：sp_size=1 时 Task 11 运行通过；sp_size>1 时不崩溃。"),
      bullet("Debug：如果 attention 报 index out of range，检查 raw_seq_len vs max_seq_len 边界。"),
      blank(),
      h2("Task 7：新增 i2v_prompts.json 示例"),
      bullet("目标：提供可直接运行的 I2V JSON 示例。"),
      bullet("涉及文件：i2v_prompts.json（新建）"),
      bullet("具体操作：参考第 6 节格式，编写 3 段 local_prompts，segment_lengths 之和等于 frame_num=81 对应的 latent_frames（约 21，取决于 vae_stride[0]=4）。"),
      bullet("验收标准：json.load(open('i2v_prompts.json')) 无报错，字段齐全。"),
      blank(),
      h2("Task 8：新增最小运行命令"),
      bullet("目标：在 README.md 中新增 I2V Prompt Relay 使用示例。"),
      bullet("涉及文件：README.md"),
      bullet("具体内容示例："),
      code("python generate.py \\"),
      code("  --task i2v-A14B \\"),
      code("  --ckpt_dir /path/to/ckpt \\"),
      code("  --image examples/i2v_input.JPG \\"),
      code("  --prompt_filepath i2v_prompts.json \\"),
      code("  --frame_num 81 \\"),
      code("  --size 1280*720"),
      blank(),
      h2("Task 9：加入 debug 日志"),
      bullet("目标：在关键位置加入 logging.debug，方便排查 lat_h / lat_w / tokens_per_frame / raw_seq_len 等值。"),
      bullet("涉及文件：wan/utils/prompt_relay.py, wan/image2video.py"),
      bullet("具体操作：在 validate_prompt_relay_sequence 中打印完整 shape 信息；在 image2video.py 调用前打印 lat_h / lat_w。"),
      blank(),
      h2("Task 10：跑 T2V 回归测试"),
      bullet("目标：确认 T2V 功能不回退。"),
      bullet("具体操作：用与 Task 3 之前相同的 prompts.json 和 --task t2v-A14B 跑一次生成，对比 cross_attn_q_token_idx 内容和视频输出。"),
      bullet("验收标准：cross_attn_q_token_idx payload 与重构前完全一致（midpoint, window, sigma, token span 全部相同）。"),
      blank(),
      h2("Task 11：跑 I2V 最小样例"),
      bullet("目标：确认 I2V Prompt Relay 端到端可运行。"),
      bullet("具体操作：使用 Task 8 中的命令和 Task 7 中的 i2v_prompts.json 跑一次完整生成。"),
      bullet("验收标准：视频成功生成，生成过程中可以看到 cross_attn_q_token_idx 不为 None 的日志。"),
      bullet("Debug：如果 cross_attn_q_token_idx 为 None，检查 prompt_filepath 是否正确透传；如果 tensor shape 报错，检查 tokens_per_frame 计算值。"),

      sep(),
      // ─── SECTION 11: 风险与测试计划 ───
      h1("11. 风险与测试计划"),
      blank(),
      makeTable(
        ["风险点", "严重程度", "缓解措施"],
        [
          ["I2V lat_h / lat_w 从错误来源获取", "🔴 高", "Task 5 中强制要求从 target_shape 提取，并在 validate 中加 assert"],
          ["max_seq_len 和 raw_seq_len 混淆", "🔴 高", "validate_prompt_relay_sequence 严格校验 raw_seq_len，注释中明确禁止使用 max_seq_len"],
          ["T2V 回归退化", "🟡 中", "Task 10 强制回归测试，对比 payload 内容"],
          ["padding token 被错误 penalty", "🟡 中", "Task 6 检查 padding guard，sp_size=1 的场景可先跳过"],
          ["segment_lengths 与实际 latent_frames 不匹配", "🟢 低", "validate 中加 assert sum(segment_lengths) <= latent_frames"],
          ["local_prompt 在 full_prompt 中找不到", "🟢 低", "sentence_to_token_indices 已有 ValueError，信息需包含具体 prompt 内容"],
        ],
        [2800, 1200, 4400]
      ),

      sep(),
      // ─── SECTION 12: 最终建议 ───
      h1("12. 最终建议"),
      h2("12.1 工程量评估"),
      blank(),
      makeTable(
        ["维度", "评估"],
        [
          ["工程量", "中（新增/修改约 150~250 行，新增 1 个文件，修改 3~4 个文件）"],
          ["难度", "中（最难点是找到 image2video.py 中真实 lat_h / lat_w 的赋值位置）"],
          ["是否需要重训", "否"],
          ["是否影响 checkpoint", "否"],
          ["是否影响显存", "否"],
          ["是否影响速度", "否"],
        ],
        [2400, 7000]
      ),
      blank(),
      h2("12.2 推荐 MVP 范围（第一版）"),
      bullet("实现 wan/utils/prompt_relay.py 公共模块"),
      bullet("重构 text2video.py 使用公共模块（保证 T2V 不回退）"),
      bullet("修改 generate.py 透传 prompt_filepath 到 I2V"),
      bullet("修改 image2video.py 接入 Prompt Relay（sp_size=1 场景）"),
      bullet("新增 i2v_prompts.json 示例和 README 命令"),
      bullet("T2V 回归测试 + I2V 最小样例"),
      blank(),
      h2("12.3 不建议第一版做的事情"),
      bullet("不建议同时处理 TI2V —— 等 I2V 稳定后再扩展，复用相同公共模块。"),
      bullet("不建议第一版支持秒单位的 JSON 输入 —— latent frame 单位已足够，秒的转换引入额外依赖。"),
      bullet("不建议第一版修改 attention.py 的 padding guard —— sp_size=1 场景不存在此问题，先 MVP 再处理分布式场景。"),
      bullet("不建议第一版做自动从 frame_num / fps 推算 segment_lengths —— 保持 JSON 显式指定，减少隐含逻辑。"),

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/home/claude/prompt_relay_i2v_arch.docx', buffer);
  console.log('Done.');
});