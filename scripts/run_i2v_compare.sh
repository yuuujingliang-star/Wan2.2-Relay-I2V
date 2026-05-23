#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./scripts/run_i2v_compare.sh <duration> <mode> [case_filter]

Arguments:
  duration:
    9s | 15s

  mode:
    relay | baseline | both

  case_filter:
    Optional substring filter for case directory name.

Environment:
  FORCE=1    Force overwrite existing outputs. Default: skip existing outputs.

Examples:
  ./scripts/run_i2v_compare.sh 9s both
  ./scripts/run_i2v_compare.sh 15s relay chef
  FORCE=1 ./scripts/run_i2v_compare.sh 9s baseline NewYear
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

DURATION="$1"
MODE="$2"
CASE_FILTER="${3:-}"

case "$DURATION" in
  9s)
    FRAME_NUM=145
    LATENT_FRAMES=37
    ;;
  15s)
    FRAME_NUM=241
    LATENT_FRAMES=61
    ;;
  *)
    echo "[ERROR] duration must be one of: 9s, 15s"
    exit 1
    ;;
esac

case "$MODE" in
  relay|baseline|both)
    ;;
  *)
    echo "[ERROR] mode must be one of: relay, baseline, both"
    exit 1
    ;;
esac

PROJECT_ROOT="/gemini/platform/public/aigc/human_guozz2/code/lyj/Wan2.2-Relay-I2V"
MODEL_DIR="/gemini/platform/public/aigc/human_guozz2/model/Wan2.2-I2V-A14B"
CASE_ROOT="$PROJECT_ROOT/data/i2v_cases"
OUTPUT_ROOT="$PROJECT_ROOT/outputs/i2v_prompt_relay/$DURATION"
RELAY_DIR="$OUTPUT_ROOT/relay"
BASELINE_DIR="$OUTPUT_ROOT/baseline"
LOG_DIR="$OUTPUT_ROOT/logs"
RUNTIME_PROMPT_DIR="$OUTPUT_ROOT/runtime_prompts"
BASELINE_PROMPT_DIR="$OUTPUT_ROOT/baseline_prompts"
RESULTS_CSV="$OUTPUT_ROOT/results.csv"

mkdir -p "$RELAY_DIR" "$BASELINE_DIR" "$LOG_DIR" "$RUNTIME_PROMPT_DIR" "$BASELINE_PROMPT_DIR"

if [[ ! -f "$RESULTS_CSV" ]]; then
  echo "timestamp,case_name,duration,mode,frame_num,image_path,prompt_json,output_path,log_path,status" > "$RESULTS_CSV"
fi

cd "$PROJECT_ROOT"

append_result() {
  local timestamp="$1"
  local case_name="$2"
  local duration="$3"
  local mode="$4"
  local frame_num="$5"
  local image_path="$6"
  local prompt_json="$7"
  local output_path="$8"
  local log_path="$9"
  local status="${10}"

  echo "${timestamp},${case_name},${duration},${mode},${frame_num},${image_path},${prompt_json},${output_path},${log_path},${status}" >> "$RESULTS_CSV"
}

find_image_path() {
  local case_dir="$1"
  local candidate

  for candidate in \
    "$case_dir/input.png" \
    "$case_dir/input.jpg" \
    "$case_dir/input.jpeg" \
    "$case_dir/INPUT.png" \
    "$case_dir/INPUT.jpg" \
    "$case_dir/INPUT.jpeg"
  do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  candidate="$(find "$case_dir" -maxdepth 1 -type f \( -iname 'input.png' -o -iname 'input.jpg' -o -iname 'input.jpeg' \) | head -n 1 || true)"
  if [[ -n "$candidate" ]]; then
    echo "$candidate"
    return 0
  fi

  return 1
}

generate_runtime_prompt_json() {
  local src_prompt_json="$1"
  local dst_runtime_json="$2"
  local duration="$3"
  local latent_frames="$4"

  python - <<'PY' "$src_prompt_json" "$dst_runtime_json" "$duration" "$latent_frames"
import json
import sys

src = sys.argv[1]
dst = sys.argv[2]
duration = sys.argv[3]
latent_frames = int(sys.argv[4])

with open(src, "r", encoding="utf-8") as f:
    data = json.load(f)

global_prompt = data.get("global_prompt", "")
local_prompts = data.get("local_prompts", [])
segment_lengths = None

if not isinstance(global_prompt, str):
    raise ValueError(f"global_prompt must be a string: {src}")
if not isinstance(local_prompts, list) or not all(isinstance(x, str) for x in local_prompts):
    raise ValueError(f"local_prompts must be a list of strings: {src}")
if len(local_prompts) == 0:
    raise ValueError(f"local_prompts is empty: {src}")

if "segment_lengths_by_duration" in data:
    by_duration = data["segment_lengths_by_duration"]
    if not isinstance(by_duration, dict):
        raise ValueError(f"segment_lengths_by_duration must be a dict: {src}")
    if duration not in by_duration:
        raise ValueError(f"segment_lengths_by_duration missing duration={duration}: {src}")
    segment_lengths = by_duration[duration]
elif "segment_lengths" in data:
    segment_lengths = data["segment_lengths"]
else:
    base = latent_frames // len(local_prompts)
    rem = latent_frames % len(local_prompts)
    segment_lengths = [base + (1 if i < rem else 0) for i in range(len(local_prompts))]

if not isinstance(segment_lengths, list) or not all(isinstance(x, int) for x in segment_lengths):
    raise ValueError(f"segment_lengths must be a list of ints: {src}")
if any(x <= 0 for x in segment_lengths):
    raise ValueError(f"segment_lengths must all be positive: {src}")
if len(segment_lengths) != len(local_prompts):
    raise ValueError(
        f"segment_lengths length {len(segment_lengths)} != local_prompts length {len(local_prompts)}: {src}"
    )
if sum(segment_lengths) > latent_frames:
    raise ValueError(
        f"segment_lengths sum {sum(segment_lengths)} exceeds latent_frames {latent_frames}: {src}"
    )

runtime_data = {
    "global_prompt": global_prompt,
    "local_prompts": local_prompts,
    "segment_lengths": segment_lengths,
}

with open(dst, "w", encoding="utf-8") as f:
    json.dump(runtime_data, f, ensure_ascii=False, indent=2)
PY
}

generate_baseline_prompt_txt() {
  local src_prompt_json="$1"
  local dst_prompt_txt="$2"

  python - <<'PY' "$src_prompt_json" "$dst_prompt_txt"
import json
import sys

src = sys.argv[1]
dst = sys.argv[2]

with open(src, "r", encoding="utf-8") as f:
    data = json.load(f)

global_prompt = data.get("global_prompt", "").strip()
local_prompts = [x.strip() for x in data.get("local_prompts", [])]

if not global_prompt:
    raise ValueError(f"global_prompt is empty: {src}")
if not local_prompts:
    raise ValueError(f"local_prompts is empty: {src}")

long_prompt = global_prompt + " " + " ".join(local_prompts)

with open(dst, "w", encoding="utf-8") as f:
    f.write(long_prompt)
PY
}

read_baseline_prompt() {
  local prompt_txt="$1"
  cat "$prompt_txt"
}

run_one_mode() {
  local case_name="$1"
  local image_path="$2"
  local prompt_json="$3"
  local runtime_prompt_json="$4"
  local baseline_prompt_txt="$5"
  local mode="$6"

  local output_path=""
  local log_path=""
  local prompt_arg=()

  if [[ "$mode" == "relay" ]]; then
    output_path="$RELAY_DIR/${case_name}.mp4"
    log_path="$LOG_DIR/${case_name}_relay.log"
    prompt_arg=(--prompt_filepath "$runtime_prompt_json")
  else
    output_path="$BASELINE_DIR/${case_name}.mp4"
    log_path="$LOG_DIR/${case_name}_baseline.log"
    local long_prompt
    long_prompt="$(read_baseline_prompt "$baseline_prompt_txt")"
    prompt_arg=(--prompt "$long_prompt")
  fi

  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

  if [[ -f "$output_path" && "${FORCE:-0}" != "1" ]]; then
    echo "[SKIP] output exists: $output_path"
    append_result "$timestamp" "$case_name" "$DURATION" "$mode" "$FRAME_NUM" "$image_path" "$prompt_json" "$output_path" "$log_path" "skipped"
    return 0
  fi

  echo "[RUN] case=$case_name mode=$mode duration=$DURATION"
  echo "[LOG] $log_path"

  set +e
  python generate.py \
    --task i2v-A14B \
    --ckpt_dir "$MODEL_DIR" \
    --image "$image_path" \
    --offload_model True \
    --convert_model_dtype \
    --frame_num "$FRAME_NUM" \
    --size "832*480" \
    --sample_steps 50 \
    --sample_guide_scale 5.0 \
    --base_seed 123 \
    --save_file "$output_path" \
    "${prompt_arg[@]}" \
    2>&1 | tee "$log_path"
  local cmd_status=${PIPESTATUS[0]}
  set -e

  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

  if [[ $cmd_status -eq 0 && -f "$output_path" ]]; then
    echo "[OK] $output_path"
    append_result "$timestamp" "$case_name" "$DURATION" "$mode" "$FRAME_NUM" "$image_path" "$prompt_json" "$output_path" "$log_path" "success"
    return 0
  else
    echo "[FAIL] case=$case_name mode=$mode"
    append_result "$timestamp" "$case_name" "$DURATION" "$mode" "$FRAME_NUM" "$image_path" "$prompt_json" "$output_path" "$log_path" "failed"
    return 1
  fi
}

mapfile -t CASE_DIRS < <(find "$CASE_ROOT" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#CASE_DIRS[@]} -eq 0 ]]; then
  echo "[ERROR] no case directories found under $CASE_ROOT"
  exit 1
fi

FAILED_CASES=()

for case_dir in "${CASE_DIRS[@]}"; do
  case_name="$(basename "$case_dir")"

  if [[ -n "$CASE_FILTER" && "$case_name" != *"$CASE_FILTER"* ]]; then
    continue
  fi

  prompt_json="$case_dir/prompts.json"
  if [[ ! -f "$prompt_json" ]]; then
    echo "[WARN] missing prompts.json, skip: $case_name"
    FAILED_CASES+=("${case_name}:missing_prompts_json")
    continue
  fi

  if ! image_path="$(find_image_path "$case_dir")"; then
    echo "[WARN] missing input image, skip: $case_name"
    FAILED_CASES+=("${case_name}:missing_input_image")
    continue
  fi

  runtime_prompt_json="$RUNTIME_PROMPT_DIR/${case_name}_prompts.json"
  baseline_prompt_txt="$BASELINE_PROMPT_DIR/${case_name}_baseline_prompt.txt"

  if ! generate_runtime_prompt_json "$prompt_json" "$runtime_prompt_json" "$DURATION" "$LATENT_FRAMES"; then
    echo "[WARN] failed to generate runtime prompt json: $case_name"
    FAILED_CASES+=("${case_name}:runtime_prompt_json_failed")
    continue
  fi

  if ! generate_baseline_prompt_txt "$prompt_json" "$baseline_prompt_txt"; then
    echo "[WARN] failed to generate baseline prompt txt: $case_name"
    FAILED_CASES+=("${case_name}:baseline_prompt_txt_failed")
    continue
  fi

  if [[ "$MODE" == "relay" || "$MODE" == "both" ]]; then
    if ! run_one_mode "$case_name" "$image_path" "$prompt_json" "$runtime_prompt_json" "$baseline_prompt_txt" "relay"; then
      FAILED_CASES+=("${case_name}:relay")
    fi
  fi

  if [[ "$MODE" == "baseline" || "$MODE" == "both" ]]; then
    if ! run_one_mode "$case_name" "$image_path" "$prompt_json" "$runtime_prompt_json" "$baseline_prompt_txt" "baseline"; then
      FAILED_CASES+=("${case_name}:baseline")
    fi
  fi
done

echo
echo "===== Summary ====="
if [[ ${#FAILED_CASES[@]} -eq 0 ]]; then
  echo "All requested cases completed without recorded failures."
else
  echo "Failed cases:"
  for item in "${FAILED_CASES[@]}"; do
    echo "  - $item"
  done
  exit 1
fi
