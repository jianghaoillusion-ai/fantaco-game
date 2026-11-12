#!/bin/sh
# 原生逐格輸出；不設 -r、不使用 fps filter、不插幀。縮小空間尺寸不改時間。
set -eu
src=${1:?source video}; dest=${2:?external-drive output directory}
case "$dest" in /Volumes/外接資料碟/*) ;; *) echo 'Output must be on external drive' >&2; exit 1;; esac
mkdir -p "$dest"
"$HOME/media-tools/bin/ffprobe" -v error -select_streams v:0 -show_streams -show_frames -show_entries frame=best_effort_timestamp_time -of json "$src" > "$dest/probe.json"
"$HOME/media-tools/bin/ffmpeg" -v error -i "$src" -vf scale=540:-1 -fps_mode passthrough "$dest/%04d.png"
