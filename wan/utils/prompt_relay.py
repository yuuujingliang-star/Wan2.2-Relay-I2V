# 公共模块不依赖 size
# 显式接收 latent_frames / lat_h / lat_w / patch_size
# q_token_idx payload 已携带 raw_seq_len
# window 非负
# sigma 动态计算并有下界保护
# epsilon 有合法性检查
# segment_lengths 有正整数检查

import math


def validate_prompt_relay_sequence(
    latent_frames,
    lat_h,
    lat_w,
    patch_size,
    segment_lengths=None,
):
    patch_h = patch_size[1]
    patch_w = patch_size[2]

    tokens_per_frame = (lat_h // patch_h) * (lat_w // patch_w)
    raw_seq_len = latent_frames * tokens_per_frame
    expected_raw_seq_len = latent_frames * lat_h * lat_w // (patch_h * patch_w)

    assert raw_seq_len == expected_raw_seq_len, (
        f"Prompt Relay raw_seq_len mismatch: {raw_seq_len=} "
        f"{expected_raw_seq_len=} {latent_frames=} {lat_h=} {lat_w=} {patch_size=}"
    )

    if segment_lengths:
        total_segment_len = sum(segment_lengths)
        if total_segment_len > latent_frames:
            raise ValueError(
                "Prompt Relay segment_lengths exceed latent_frames: "
                f"{total_segment_len=} {latent_frames=} {segment_lengths=}"
            )

    return {
        "tokens_per_frame": tokens_per_frame,
        "raw_seq_len": raw_seq_len,
        "expected_raw_seq_len": expected_raw_seq_len,
    }


def _find_subsequence(haystack, needle):
    for start in range(len(haystack) - len(needle) + 1):
        if haystack[start:start + len(needle)] == needle:
            return start, start + len(needle)
    return None


def _find_local_prompt_token_spans(tokenizer, full_prompt, local_prompts):
    full_ids = tokenizer(
        full_prompt,
        add_special_tokens=True,
        padding=False,
        return_mask=False,
    )[0].tolist()

    token_spans = {}
    for prompt in local_prompts:
        prompt_ids = tokenizer(
            prompt,
            add_special_tokens=False,
            padding=False,
        )[0].tolist()
        match = _find_subsequence(full_ids, prompt_ids)
        if match is None:
            raise ValueError(f"Prompt Relay local prompt not found in full prompt: {prompt}")
        token_spans[prompt] = match

    return token_spans


def build_cross_attn_q_token_idx(
    local_prompts,
    token_spans,
    latent_frames,
    tokens_per_frame,
    raw_seq_len,
    segment_lengths=None,
    epsilon=0.1,
):
    if not (0 < epsilon < 1):
        raise ValueError(f"Prompt Relay epsilon must be in (0,1), got {epsilon}")

    q_token_idx = []

    if not local_prompts:
        return q_token_idx

    if segment_lengths:
        frame_intervals = []
        frame_counter = 0
        for i, seg_len in enumerate(segment_lengths):
            frame_start = frame_counter
            frame_end = min(frame_counter + seg_len, latent_frames)
            frame_intervals.append((frame_start, frame_end, [local_prompts[i]]))
            frame_counter += seg_len
    else:
        step = math.ceil(latent_frames / len(local_prompts))
        frame_intervals = [
            (step * i, min(step * (i + 1), latent_frames), [local_prompts[i]])
            for i in range(len(local_prompts))
        ]

    for frame_start, frame_end, subsentences in frame_intervals:
        spans = []
        for subsentence in subsentences:
            start, end = token_spans[subsentence]
            spans.extend(range(start, end))

        window = max((frame_end - frame_start) // 2 - 2, 0)
        midpoint = (frame_start + frame_end) // 2
        segment_half_length = max(frame_end - midpoint, 0)
        sigma = max(
            (segment_half_length - window) / math.sqrt(
                2 * math.log(1 / epsilon)
            ),
            1e-6,
        )

        payload = {
            "window": window,
            "sigma": sigma,
            "midpoint": midpoint,
            "tokens_per_frame": tokens_per_frame,
            "raw_seq_len": raw_seq_len,
            "local_token_idx": spans,
        }
        q_token_idx.append(payload)

    return q_token_idx


def maybe_prepare_prompt_relay(
    prompt_filepath,
    input_prompt,
    tokenizer,
    latent_frames,
    lat_h,
    lat_w,
    patch_size,
    debug=False,
):
    if prompt_filepath is None:
        return None, input_prompt

    import json

    with open(prompt_filepath, "r") as f:
        prompt_data = json.load(f)

    global_prompt = prompt_data.get("global_prompt", "")
    local_prompts = prompt_data.get("local_prompts", [])
    segment_lengths = prompt_data.get("segment_lengths", [])

    if not isinstance(global_prompt, str):
        raise ValueError("Prompt Relay global_prompt must be a string.")
    if not isinstance(local_prompts, list) or not all(
        isinstance(prompt, str) for prompt in local_prompts
    ):
        raise ValueError("Prompt Relay local_prompts must be a list of strings.")
    if segment_lengths and (
        not isinstance(segment_lengths, list)
        or not all(isinstance(length, int) for length in segment_lengths)
    ):
        raise ValueError("Prompt Relay segment_lengths must be a list of ints.")
    if segment_lengths and any(length <= 0 for length in segment_lengths):
        raise ValueError("Prompt Relay segment_lengths must contain only positive ints.")
    if segment_lengths and len(segment_lengths) != len(local_prompts):
        raise ValueError(
            "Prompt Relay segment_lengths must have the same length as local_prompts."
        )

    local_prompts = [" " + prompt for prompt in local_prompts]
    full_prompt = global_prompt + "".join(local_prompts)

    sequence_info = validate_prompt_relay_sequence(
        latent_frames=latent_frames,
        lat_h=lat_h,
        lat_w=lat_w,
        patch_size=patch_size,
        segment_lengths=segment_lengths,
    )

    token_spans = _find_local_prompt_token_spans(tokenizer, full_prompt, local_prompts)
    q_token_idx = build_cross_attn_q_token_idx(
        local_prompts=local_prompts,
        token_spans=token_spans,
        latent_frames=latent_frames,
        tokens_per_frame=sequence_info["tokens_per_frame"],
        raw_seq_len=sequence_info["raw_seq_len"],
        segment_lengths=segment_lengths,
    )

    if debug:
        print(
            "Prompt Relay:",
            {
                "latent_frames": latent_frames,
                "lat_h": lat_h,
                "lat_w": lat_w,
                "tokens_per_frame": sequence_info["tokens_per_frame"],
                "raw_seq_len": sequence_info["raw_seq_len"],
                "segment_lengths": segment_lengths,
                "q_token_idx_is_none": q_token_idx is None,
            },
        )

    return q_token_idx if q_token_idx else None, full_prompt
