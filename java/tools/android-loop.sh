#!/bin/bash
# Vong lap bo sung dependency AGP: chay assembleDebug offline, trich cac module
# "Could not resolve" con thieu roi tai them bang fetch_deps.py, toi da 10 vong.
cd "$(dirname "$0")/.." || exit 1
export JAVA_HOME=${JAVA_HOME:-$HOME/workspace/tools/jdk17}
export GRADLE_USER_HOME=$PWD/.gradle-home
export https_proxy=http://hatch-egress-proxy:3128 http_proxy=http://hatch-egress-proxy:3128
for i in $(seq 1 10); do
  out=$(./gradlew --offline :android:assembleDebug </dev/null 2>&1)
  if echo "$out" | grep -q "BUILD SUCCESSFUL"; then
    echo "ANDROID_BUILD_OK round=$i"
    ls -la android/build/outputs/apk/debug/ 2>/dev/null
    exit 0
  fi
  misses=$(echo "$out" | grep -oE "Could not resolve [a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.+-]+" | sed 's/Could not resolve //; s/\.$//' | sort -u)
  if [ -z "$misses" ]; then
    echo "ROUND $i: FAILED with non-resolution error:"
    echo "$out" | grep -B3 -A14 "What went wrong" | head -40
    exit 2
  fi
  echo "ROUND $i missing $(echo "$misses" | wc -l) modules:"
  echo "$misses" | head -20
  python3 tools/fetch_deps.py $misses >/dev/null 2>&1
done
echo "EXHAUSTED_ROUNDS"
exit 3
