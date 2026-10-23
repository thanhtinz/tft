#!/usr/bin/env python3
# Dong bo project Java -> staging day len GitHub (~/workspace/tft-java-push/java).
# Quy uoc repo: file nhi phan (.png/.ttf/.wav/.jar) luu dang .b64; loai build/, .gradle-home/,
# local-maven/, local.properties va anh chup kiem chung tools/*.png (chi giu tai may local).
import base64
import os
import shutil
import sys

SRC = os.path.expanduser("~/workspace/tft-java-game")
DST = os.path.expanduser("~/workspace/tft-java-push/java")
PATHS_FILE = os.path.expanduser("~/workspace/tft-java-push.paths")
BINARY_EXT = {".png", ".ttf", ".wav", ".jar", ".jpg", ".webp"}
EXCLUDE_DIRS = {"local-maven", ".gradle-home", ".gradle", "build", ".git", "__pycache__"}


def main():
    if os.path.isdir(DST):
        shutil.rmtree(DST)
    paths = []
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for name in files:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, SRC)
            if rel == "local.properties":
                continue
            if rel.startswith("tools/") and name.endswith(".png"):
                continue  # anh chup kiem chung + preview sheet: chi luu local
            dest_rel = "java/" + rel.replace(os.sep, "/")
            dest = os.path.join(DST, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            ext = os.path.splitext(name)[1].lower()
            if ext in BINARY_EXT:
                with open(full, "rb") as f:
                    data = base64.encodebytes(f.read()).decode("ascii")
                with open(dest + ".b64", "w", encoding="ascii", newline="\n") as f:
                    f.write(data if data.endswith("\n") else data + "\n")
                paths.append(dest_rel + ".b64")
            else:
                shutil.copy2(full, dest)
                paths.append(dest_rel)
    paths.sort()
    # github push-files yeu cau paths-file phan tach bang NUL va ket thuc bang NUL
    with open(PATHS_FILE, "wb") as f:
        f.write(("\0".join(paths) + "\0").encode("utf-8"))
    total = 0
    for root, _, files in os.walk(DST):
        for n in files:
            total += os.path.getsize(os.path.join(root, n))
    print(f"STAGED {len(paths)} files, {total/1024:.0f} KB total")
    print("paths file:", PATHS_FILE)


if __name__ == "__main__":
    sys.exit(main())
