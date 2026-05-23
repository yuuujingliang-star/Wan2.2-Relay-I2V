# Wan Prompt Relay I2V

Unofficial Image-to-Video extension of Prompt Relay for Wan2.2-I2V-A14B.

This repository adapts the inference-time temporal prompt routing mechanism from [Prompt Relay](https://github.com/GordonChen19/Prompt-Relay) to the Wan2.2 Image-to-Video pipeline. It is intended for research and engineering experiments on temporally controlled I2V generation.

This is not an official Wan2.2 repository, not an official Prompt Relay release, and not a new video generation model. The base generation model is Wan2.2-I2V-A14B, and the temporal control method is Prompt Relay.

## What This Repository Adds

- I2V support for Prompt Relay style temporal prompt control in `WanI2V.generate(...)`.
- `--prompt_filepath` forwarding from `generate.py` into the Wan2.2-I2V pipeline.
- A shared prompt-relay preparation module at `wan/utils/prompt_relay.py`.
- Latent-frame based segment handling for I2V, using the actual latent resolution derived from the input image aspect ratio.
- Local prompt token-span lookup, segment validation, dynamic temporal falloff parameters, and raw sequence length handling for padded visual tokens.
- Batch scripts and example I2V cases for comparing a long-prompt baseline against Prompt Relay controlled generation.

This repository does not provide new model weights, training code, or a new temporal control algorithm.

## Method Overview

Prompt Relay represents a video prompt as one global prompt plus several local prompts. The global prompt describes persistent identity, style, scene constraints, and other information that should remain stable. Each local prompt describes what should happen during a specific temporal segment.

During inference, local prompt tokens are encouraged to attend to visual query tokens near their assigned latent-frame interval. This is implemented by adding a temporal cost to text cross-attention logits. Queries far from a local prompt's assigned segment receive a larger penalty for attending to that local prompt's tokens.

In this I2V extension, the image condition still enters Wan2.2-I2V through the original image-conditioning path. Prompt Relay only changes the conditional text cross-attention behavior during denoising.

## Prompt Format

Use a JSON file with:

```json
{
  "global_prompt": "A cinematic shot of the same person, consistent identity, consistent clothing, stable lighting.",
  "local_prompts": [
    "The person stands indoors and looks toward the window.",
    "The person walks outside into a bright street.",
    "The person stops and smiles toward the camera."
  ],
  "segment_lengths": [12, 12, 13]
}
```

`segment_lengths` are measured in latent frames, not seconds and not output video frames. For Wan2.2-I2V with `frame_num = 145`, the latent frame count is usually 37. With `frame_num = 241`, it is usually 61.

If `segment_lengths` is omitted, the local prompts are assigned to approximately equal latent-frame intervals.

## Image-to-Video Usage

Download Wan2.2-I2V-A14B weights from the official Wan-AI model page first. This repository does not include model weights.

```bash
python generate.py \
  --task i2v-A14B \
  --ckpt_dir ./Wan2.2-I2V-A14B \
  --image ./data/i2v_cases/case004/input.png \
  --prompt_filepath ./data/i2v_cases/case004/prompts.json \
  --size 832*480 \
  --frame_num 145 \
  --sample_steps 50 \
  --sample_guide_scale 5.0 \
  --base_seed 123 \
  --offload_model True \
  --convert_model_dtype \
  --save_file ./outputs/case004_i2v_prompt_relay.mp4
```

For a baseline without Prompt Relay, pass a single long `--prompt` instead of `--prompt_filepath`.

## Batch Comparison

The helper script runs baseline and Prompt Relay generations for cases under `data/i2v_cases`.

```bash
./scripts/run_i2v_compare.sh 9s both
./scripts/run_i2v_compare.sh 15s relay
```

The script writes generated prompts, logs, CSV summaries, and videos under `outputs/i2v_prompt_relay/<duration>/`.

Before publishing a fork, consider excluding generated videos and logs from Git history unless their provenance and license are clear.

## Implementation Notes

The main I2V path is:

- `generate.py` reads `--image` and `--prompt_filepath`.
- `generate.py` calls `WanI2V.generate(..., prompt_filepath=args.prompt_filepath)`.
- `wan/image2video.py` computes the I2V latent size from the input image aspect ratio.
- `wan/utils/prompt_relay.py` reads `global_prompt`, `local_prompts`, and `segment_lengths`, then builds temporal cross-attention routing metadata.
- `wan/image2video.py` passes `cross_attn_q_token_idx` into the conditional branch of the Wan model.
- `wan/modules/model.py` applies Prompt Relay's temporal cost inside cross-attention when routing metadata is provided.

The original Wan2.2 image conditioning path is preserved: the input image is resized, encoded through the VAE as the first-frame condition, concatenated with a mask, and passed to the model as `y`.

## Limitations

- This is an inference-time experiment and has not been trained or fine-tuned.
- Temporal control quality depends on prompt wording, segment length, seed, model behavior, and input image compatibility.
- The implementation is primarily tested for Wan2.2-I2V-A14B.
- Multi-GPU and sequence parallel settings should be tested carefully for each environment.
- This repository may still contain upstream Wan2.2 modules for T2V, TI2V, S2V, and Animate that are not part of the I2V extension itself.

## Acknowledgements

This project builds on the following upstream work:

- [Prompt Relay](https://github.com/GordonChen19/Prompt-Relay), the original inference-time temporal prompt control method.
- [Wan2.2](https://github.com/Wan-Video/Wan2.2), the base video generation code and model family.
- Wan Team, "Wan: Open and Advanced Large-Scale Video Generative Models".
- [Wan-AI/Wan2.2-I2V-A14B](https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B), the base Image-to-Video model weights.
- Qwen and Qwen-VL, used by the optional prompt extension path.
- umT5-XXL, Hugging Face Transformers, Diffusers, Accelerate, PyTorch, FlashAttention, OpenCV, imageio, DashScope, and ModelScope.
- CosyVoice and SAM2, if the S2V or Animate paths from the upstream Wan2.2 code are used.

Please cite and follow the licenses of Prompt Relay, Wan2.2, Wan model weights, and any third-party assets used as input images or examples.

## License

The upstream Wan2.2 code is distributed under the Apache License 2.0. This repository contains modified upstream code and should retain upstream copyright and license notices.

If you publish this repository, add a `NOTICE.md` describing:

- the upstream Wan2.2 source,
- the Prompt Relay source and method,
- files modified for this unofficial I2V extension,
- the provenance and license of any included images or videos.

