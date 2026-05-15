"""Blender-side sprite atlas renderer placeholder.

Run through:
    node scripts/blender_sprite_pipeline.js --profile ottoman-infantry

This script expects a prepared .blend file with profile collections named
`profile:<id>` and action names matching idle/move/fire/retreat. It exports
frame images and a manifest consumed by src/data/unit-visual-profiles.js.
"""

import argparse
import json
from pathlib import Path

try:
    import bpy
except ImportError as exc:  # pragma: no cover - only runs inside Blender.
    raise SystemExit("This script must be run by Blender's Python runtime.") from exc


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--profiles", required=True)
    return parser.parse_args()


def ensure_camera():
    if bpy.context.scene.camera:
        return bpy.context.scene.camera
    camera_data = bpy.data.cameras.new("SpriteCamera")
    camera = bpy.data.objects.new("SpriteCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    camera.location = (0, -6, 3)
    camera.rotation_euler = (1.1, 0, 0)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 4.2
    return camera


def render_profile(profile_id, output_root):
    collection = bpy.data.collections.get(f"profile:{profile_id}")
    if collection is None:
        print(f"[skip] Missing collection profile:{profile_id}")
        return None

    ensure_camera()
    scene = bpy.context.scene
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"

    profile_dir = output_root / profile_id
    profile_dir.mkdir(parents=True, exist_ok=True)

    frames = []
    for index in range(0, 28):
        scene.frame_set(index + 1)
        out_file = profile_dir / f"frame-{index:03d}.png"
        scene.render.filepath = str(out_file)
        bpy.ops.render.render(write_still=True)
        frames.append(out_file.name)

    manifest = {
        "profileId": profile_id,
        "format": "png-sequence",
        "frameSize": [256, 256],
        "frames": frames,
        "license": "Project asset pipeline placeholder; verify imported model licenses before commit."
    }
    (profile_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main():
    args = parse_args()
    output_root = Path(args.output)
    output_root.mkdir(parents=True, exist_ok=True)
    manifests = {}
    for profile_id in [item.strip() for item in args.profiles.split(",") if item.strip()]:
        manifest = render_profile(profile_id, output_root)
        if manifest:
            manifests[profile_id] = manifest
    (output_root / "manifest.json").write_text(json.dumps(manifests, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
