# Wan2.2-Relay-I2V

Unofficial Image-to-Video extension of Prompt Relay for Wan2.2-I2V-A14B.

This repository adapts the inference-time temporal prompt routing mechanism from [Prompt Relay](https://github.com/GordonChen19/Prompt-Relay) to the [Wan2.2](https://github.com/Wan-Video/Wan2.2) Image-to-Video pipeline. It is intended for research and engineering experiments on temporally controlled I2V generation.

> **Disclaimer**
>
> This is not an official Wan2.2 repository, not an official Prompt Relay release, and not a new video generation model.  
> The base generation model is Wan2.2-I2V-A14B, and the temporal control method is Prompt Relay.  
> This repository only provides an unofficial engineering adaptation of Prompt Relay-style temporal routing to the Wan2.2 I2V inference path.

## What This Repository Adds

Compared with the upstream Wan2.2 / Prompt Relay codebase, this repository mainly adds:

- I2V support for Prompt Relay-style temporal prompt control in `WanI2V.generate(...)`.
- `--prompt_filepath` forwarding from `generate.py` into the Wan2.2-I2V pipeline.
- A shared Prompt Relay preparation module at `wan/utils/prompt_relay.py`.
- Latent-frame based segment handling for I2V, using the actual latent resolution derived from the input image aspect ratio.
- Local prompt token-span lookup, segment validation, dynamic temporal falloff parameters, and raw sequence length handling for padded visual tokens.
- Batch scripts and example I2V cases for comparing a long-prompt baseline against Prompt Relay controlled generation.

This repository does **not** provide new model weights, training code, or a new temporal control algorithm.

## Same-Prompt Comparison

The following examples compare the original Wan2.2 I2V baseline with this unofficial Prompt Relay I2V extension.

Each pair uses the same reference image and the same high-level multi-event prompt. The baseline uses a single long prompt, while Prompt Relay separates the prompt into `global_prompt`, `local_prompts`, and `segment_lengths` for latent-frame-level temporal routing.

The GIFs below are generated at 24 FPS with 1024px width for README preview.

### Example 1: Traveler Snow Scene

Input image: [`assets/comparison/traveler_snow/input.png`](assets/comparison/traveler_snow/input.png)  
Prompt file: [`assets/comparison/traveler_snow/prompt.json`](assets/comparison/traveler_snow/prompt.json)

| Wan2.2 + Prompt Relay I2V | Wan2.2 I2V Baseline |
|---|---|
| ![Wan2.2 + Prompt Relay I2V](assets/comparison/traveler_snow/wan22_prompt_relay_traveler_snow_15s.gif) | ![Wan2.2 I2V Baseline](assets/comparison/traveler_snow/wan22_baseline_traveler_snow_15s.gif) |

### Example 2: Wuxia Swordsman Scene

Input image: [`assets/comparison/wuxia_swordsman/input.png`](assets/comparison/wuxia_swordsman/input.png)  
Prompt file: [`assets/comparison/wuxia_swordsman/prompt.json`](assets/comparison/wuxia_swordsman/prompt.json)

| Wan2.2 + Prompt Relay I2V | Wan2.2 I2V Baseline |
|---|---|
| ![Wan2.2 + Prompt Relay I2V](assets/comparison/wuxia_swordsman/wan22_prompt_relay_wuxia_swordsman_15s.gif) | ![Wan2.2 I2V Baseline](assets/comparison/wuxia_swordsman/wan22_baseline_wuxia_swordsman_15s.gif) |


## Method Overview

Prompt Relay represents a video prompt as one global prompt plus several local prompts.

- The `global_prompt` describes persistent identity, style, scene constraints, lighting, camera style, and other information that should remain stable across the whole video.
- Each `local_prompt` describes what should happen during a specific temporal segment.
- `segment_lengths` assigns local prompts to latent-frame intervals.

During inference, local prompt tokens are encouraged to attend to visual query tokens near their assigned latent-frame interval. This is implemented by applying a temporal cost to text cross-attention logits. Queries far from a local prompt's assigned segment receive a larger penalty for attending to that local prompt's tokens.

In this I2V extension, the image condition still enters Wan2.2-I2V through the original image-conditioning path. Prompt Relay only changes the conditional text cross-attention behavior during denoising.

## Repository Structure

```text
Wan2.2-Relay-I2V/
├── generate.py                       # Main inference entry; forwards --prompt_filepath to WanI2V
├── wan/
│   ├── image2video.py                # I2V pipeline with Prompt Relay integration
│   ├── text2video.py                 # Upstream T2V path, kept for compatibility
│   ├── modules/
│   │   └── model.py                  # Cross-attention temporal cost application
│   └── utils/
│       └── prompt_relay.py           # Shared Prompt Relay JSON parsing and routing metadata
├── scripts/
│   └── run_i2v_compare.sh            # Batch baseline vs. relay comparison script
├── data/
│   ├── i2v_cases/                    # Example I2V prompt cases and example input images
│   ├── i2v_example_test/             # Additional I2V prompt examples
│   └── t2v_example_test/             # T2V prompt examples kept from experiments
├── assets/                           # Upstream Wan2.2 assets kept for documentation
├── requirements.txt                  # Core dependencies for Wan2.2 inference
├── requirements_animate.txt          # Optional upstream Animate dependencies
├── requirements_s2v.txt              # Optional upstream S2V dependencies
├── LICENSE.txt                       # Upstream Apache-2.0 license text
├── NOTICE.md                         # Upstream sources, local modifications, and asset notes
└── README.md                         # This file
```

The core I2V extension is mainly implemented in:

```text
generate.py
wan/image2video.py
wan/modules/model.py
wan/utils/prompt_relay.py
scripts/run_i2v_compare.sh
```

## Installation

Clone the repository and install the base dependencies:

```bash
git clone https://github.com/yuuujingliang-star/Wan2.2-Relay-I2V.git
cd Wan2.2-Relay-I2V
pip install -r requirements.txt
```

Optional upstream Wan2.2 dependencies are kept for compatibility:

```bash
pip install -r requirements_animate.txt  # only needed for Wan Animate
pip install -r requirements_s2v.txt      # only needed for Speech-to-Video
```

For the core I2V Prompt Relay extension, `requirements.txt` is the main dependency file.

## Model Weights

This repository does not include Wan2.2 model weights.

Please download Wan2.2-I2V-A14B weights from the official Wan-AI model page and place them in a local directory such as:

```text
./Wan2.2-I2V-A14B
```

Then pass the path through `--ckpt_dir`.

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

`segment_lengths` are measured in latent frames, not seconds and not output video frames.

For Wan2.2-I2V:

- with `frame_num = 145`, the latent frame count is usually `37`;
- with `frame_num = 241`, the latent frame count is usually `61`.

If `segment_lengths` is omitted, the local prompts are assigned to approximately equal latent-frame intervals.

Some example cases also use duration-specific segment settings such as:

```json
{
  "segment_lengths_by_duration": {
    "9s": [12, 12, 13],
    "15s": [20, 20, 21]
  }
}
```

The batch script converts the duration-specific setting into the runtime `segment_lengths` field.

## Image-to-Video Usage

The repository includes example prompt files and example input images under `data/i2v_cases/`.

Run Prompt Relay I2V generation:

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

For your own image, replace the image path:

```bash
--image /path/to/your/input.png
```

For a baseline without Prompt Relay, pass a single long `--prompt` instead of `--prompt_filepath`.

## Batch Comparison

The helper script runs baseline and Prompt Relay generations for cases under `data/i2v_cases`.

```bash
./scripts/run_i2v_compare.sh 9s both
./scripts/run_i2v_compare.sh 15s relay
```

The script writes generated prompts, logs, CSV summaries, and videos under:

```text
outputs/i2v_prompt_relay/<duration>/
```

Generated videos, logs, and CSV files are intended as experiment outputs and are excluded from the recommended public release unless their provenance and license are clear.

## Implementation Notes

The main I2V path is:

1. `generate.py` reads `--image` and `--prompt_filepath`.
2. `generate.py` calls `WanI2V.generate(..., prompt_filepath=args.prompt_filepath)`.
3. `wan/image2video.py` computes the I2V latent size from the input image aspect ratio.
4. `wan/utils/prompt_relay.py` reads `global_prompt`, `local_prompts`, and `segment_lengths`, then builds temporal cross-attention routing metadata.
5. `wan/image2video.py` passes `cross_attn_q_token_idx` into the conditional branch of the Wan model.
6. `wan/modules/model.py` applies Prompt Relay's temporal cost inside cross-attention when routing metadata is provided.

The original Wan2.2 image conditioning path is preserved: the input image is resized, encoded through the VAE as the first-frame condition, concatenated with a mask, and passed to the model as `y`.

## Assets and Examples

This repository may include small example input images and prompt JSON files for demonstration.

Before making the repository public, please make sure that:

- included input images are self-created, licensed for redistribution, or otherwise safe to publish;
- generated videos and logs are not committed unless their provenance and license are clear;
- third-party workflow assets, model outputs, or real-person images are not redistributed without permission.

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

## License and Notice

The upstream Wan2.2 code is distributed under the Apache License 2.0. This repository contains modified upstream code and should retain upstream copyright and license notices.

This repository includes:

- `LICENSE.txt`, which preserves the upstream Apache-2.0 license text;
- `NOTICE.md`, which documents upstream sources, Prompt Relay attribution, local modifications, and asset provenance requirements.

The Prompt Relay method, Wan2.2 model architecture, Wan2.2 model weights, and third-party dependencies remain the work of their respective authors.

If you redistribute this repository or make it public, please keep `LICENSE.txt`, `NOTICE.md`, and the upstream attribution in this README.
