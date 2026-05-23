# NOTICE

This repository is an unofficial Image-to-Video extension based on upstream Wan2.2 and Prompt Relay related code.

## Upstream Sources

This project contains code derived from or adapted from:

- Wan2.2 / Wan-Video, licensed under Apache License 2.0.
- GordonChen19/Wan2.2 Prompt Relay integration, used as an upstream reference for Prompt Relay-style temporal routing.
- Prompt Relay: Inference-Time Temporal Control for Multi-Event Video Generation, by Gordon Chen, Ziqi Huang, and Ziwei Liu.

## Local Modifications

The main local modifications in this repository include:

- adapting Prompt Relay-style temporal prompt routing to the Wan2.2 Image-to-Video pipeline;
- forwarding `--prompt_filepath` into `WanI2V.generate(...)`;
- adding or modifying I2V routing logic in `generate.py`, `wan/image2video.py`, `wan/utils/prompt_relay.py`, and related model code;
- adding I2V comparison scripts and example prompt cases.

## Non-Original Components

This repository does not claim ownership of:

- the Wan2.2 model architecture or model weights;
- the Prompt Relay method;
- upstream Wan2.2 T2V / I2V / TI2V / S2V / Animate modules;
- third-party dependencies such as Qwen, umT5, PyTorch, Hugging Face libraries, SAM2, or CosyVoice.

## Assets

Input images, generated videos, workflows, and demo outputs should only be included if their provenance and license are clear.
Generated outputs and logs are excluded from the recommended public release unless explicitly documented.
