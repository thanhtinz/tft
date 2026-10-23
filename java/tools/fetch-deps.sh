#!/usr/bin/env bash
# Tai toan bo dependency cua ban desktop (LibGDX 1.13.1 + LWJGL 3.3.3) bang curl
# vao kho Maven cuc bo ./local-maven — dung khi moi truong han che mang cua Java
# (Gradle khong tai truc tiep duoc). Tren may co mang binh thuong KHONG can chay file nay:
# Gradle tu tai tu Maven Central. Xem README muc "Kho dependency cuc bo".
set -e
cd "$(dirname "$0")/.."
export https_proxy="${https_proxy:-http://hatch-egress-proxy:3128}"
export http_proxy="${http_proxy:-http://hatch-egress-proxy:3128}"
python3 tools/fetch_deps.py
