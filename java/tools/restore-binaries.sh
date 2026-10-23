#!/usr/bin/env bash
# Khoi phuc cac file nhi phan (PNG sprite/scene, font TTF, gradle-wrapper.jar) tu ban .b64.
# Tren GitHub, cac file nhi phan cua thu muc java/ duoc luu dang base64 text (quy uoc cua repo nay,
# giong pipeline art cua ban RN) vi cong cu day code chi nhan file text.
# Chay 1 lan sau khi clone/pull thu muc java/:   bash tools/restore-binaries.sh
set -e
cd "$(dirname "$0")/.."
count=0
while IFS= read -r -d '' f; do
  out="${f%.b64}"
  base64 -d "$f" > "$out"
  count=$((count+1))
  echo "decoded: $out"
done < <(find assets gradle -name '*.b64' -print0 2>/dev/null)
echo "RESTORED $count binary files."
