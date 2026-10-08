#!/usr/bin/env bash
# usage: scripts/push-models.sh   (run inside your cloned sphinx repo, after optimize-models.sh)
set -e; git lfs install; git lfs track "public/models/*.glb" "public/audio/*.mp3"
git add .gitattributes public/models; git commit -m "Add compressed GLB models (Draco+WebP) via Git LFS"; git push
