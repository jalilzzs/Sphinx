#!/usr/bin/env bash
# usage: scripts/optimize-models.sh /path/to/original/glbs   (Draco geometry + WebP textures, max 1024px)
set -e; SRC="${1:-.}"; mkdir -p public/models
for n in bathroom_interior.glb "abandoned_warehouse_-_interior_scene.glb" southwark_borough_control_bunker.glb st_pancras_new_church_crypt.glb the_hallwyl_museum_1st_floor_combined.glb algerian_man.glb beautiful_young_woman_wearing_a_floral_dress.glb; do
  echo "→ $n"; npx -y @gltf-transform/cli optimize "$SRC/$n" "public/models/$n" --compress draco --texture-compress webp --texture-size 1024
done; ls -lh public/models
