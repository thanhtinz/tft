#!/usr/bin/env python3
"""BFS tai POM + Gradle Module Metadata + moi file jar/classifier duoc tham chieu
vao ./local-maven theo dung cau truc Maven. Chay: bash tools/fetch-deps.sh"""
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "local-maven")
BASE = "https://repo.maven.apache.org/maven2"
GOOGLE = "https://dl.google.com/dl/android/maven2"  # AGP + com.android.* chi co o Google Maven


def fetch_rel(gp, a, v, fname, dest):
    """Tai 1 file cua artifact, thu Maven Central truoc roi Google Maven."""
    if fetch(f"{BASE}/{gp}/{a}/{v}/{fname}", dest):
        return True
    return fetch(f"{GOOGLE}/{gp}/{a}/{v}/{fname}", dest)
NS = {"m": "http://maven.apache.org/POM/4.0.0"}

SEED = [
    ("com.badlogicgames.gdx", "gdx", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-freetype", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-backend-lwjgl3", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-platform", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.13.1"),
    # Dot hoan thien: LibGDX 1.14.0 + backend TeaVM 1.4.0 (TeaVM 0.13)
    ("com.badlogicgames.gdx", "gdx", "1.14.0"),
    ("com.badlogicgames.gdx", "gdx-freetype", "1.14.0"),
    ("com.badlogicgames.gdx", "gdx-backend-lwjgl3", "1.14.0"),
    ("com.badlogicgames.gdx", "gdx-platform", "1.14.0"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.14.0"),
    ("com.github.xpenatan.gdx-teavm", "backend-teavm", "1.4.0"),
    ("com.github.xpenatan.gdx-teavm", "gdx-freetype-teavm", "1.4.0"),
    ("com.github.xpenatan.gdx-teavm", "asset-loader", "1.4.0"),
    # Android: AGP (chi co tren Google Maven) + backend Android cua LibGDX 1.14.0
    ("com.android.tools.build", "gradle", "8.5.2"),
    ("com.android.tools", "desugar_jdk_libs", "2.1.3"),
    ("com.badlogicgames.gdx", "gdx-backend-android", "1.14.0"),
]
# Cac jar classifier can tai thu cong (khai trong build.gradle dang :classifier,
# hoac POM cua gdx-backend-lwjgl3 yeu cau cho LWJGL — Gradle resolve tat ca bien the natives)
CLASSIFIERS = [
    ("com.badlogicgames.gdx", "gdx-platform", "1.13.1", "natives-desktop"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.13.1", "natives-desktop"),
    ("com.badlogicgames.gdx", "gdx-platform", "1.14.0", "natives-desktop"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.14.0", "natives-desktop"),
]
for _plat in ("gdx-platform", "gdx-freetype-platform"):
    for _abi in ("natives-armeabi-v7a", "natives-arm64-v8a", "natives-x86_64"):
        CLASSIFIERS.append(("com.badlogicgames.gdx", _plat, "1.14.0", _abi))
for _a in ("lwjgl", "lwjgl-glfw", "lwjgl-jemalloc", "lwjgl-openal", "lwjgl-opengl", "lwjgl-stb"):
    for _c in ("natives-linux", "natives-linux-arm32", "natives-linux-arm64", "natives-macos",
               "natives-macos-arm64", "natives-windows", "natives-windows-x86"):
        CLASSIFIERS.append(("org.lwjgl", _a, "3.3.3", _c))


def path_of(g, a, v, fname):
    return os.path.join(ROOT, g.replace(".", "/"), a, v, fname)


def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    r = subprocess.run(["curl", "-sL", "--fail", "--max-time", "120", "-o", dest + ".tmp", url])
    if r.returncode != 0:
        if os.path.exists(dest + ".tmp"):
            os.remove(dest + ".tmp")
        return False
    os.rename(dest + ".tmp", dest)
    print("GET", url)
    return True


def resolve_props(text, props):
    def rep(m):
        return props.get(m.group(1), m.group(0))
    return re.sub(r"\$\{([^}]+)\}", rep, text)


def pom_deps(pom_path):
    """Tra ve list (g,a,v) tu POM: dependencies truc tiep (bo test/provided/optional)."""
    try:
        tree = ET.parse(pom_path)
    except Exception:
        return [], {}
    root = tree.getroot()
    props = {}
    pel = root.find("m:properties", NS)
    if pel is not None:
        for child in pel:
            props[child.tag.split("}")[-1]] = child.text or ""
    proj = {}
    for tag in ("groupId", "artifactId", "version"):
        el = root.find("m:" + tag, NS)
        if el is not None:
            proj[tag] = el.text
    deps = []
    parent = root.find("m:parent", NS)
    if parent is not None:
        pg = parent.find("m:groupId", NS).text
        pa = parent.find("m:artifactId", NS).text
        pv = parent.find("m:version", NS).text
        deps.append((pg, pa, pv))
    for dep in root.iter("{http://maven.apache.org/POM/4.0.0}dependency"):
        def txt(tag):
            el = dep.find("m:" + tag, NS)
            return resolve_props(el.text, props) if el is not None and el.text else None
        scope = txt("scope") or "compile"
        optional = txt("optional") or "false"
        if scope in ("test", "provided", "system") or optional == "true":
            continue
        g, a, v = txt("groupId"), txt("artifactId"), txt("version")
        if g and a and v and not v.startswith("[") and "${" not in v:
            deps.append((g, a, v))
    return deps, props


def main():
    queue = list(SEED)
    # Seed bo sung qua dong lenh: python3 fetch_deps.py group:artifact:version [...]
    for extra in sys.argv[1:]:
        parts = extra.split(":")
        if len(parts) == 3:
            queue.append(tuple(parts))
    seen = set()
    while queue:
        g, a, v = queue.pop(0)
        key = (g, a, v)
        if key in seen:
            continue
        seen.add(key)
        gp = g.replace(".", "/")
        base_url = f"{BASE}/{gp}/{a}/{v}"
        pom_name = f"{a}-{v}.pom"
        if not fetch_rel(gp, a, v, pom_name, path_of(g, a, v, pom_name)):
            print("MISS POM", g, a, v, file=sys.stderr)
            continue
        # Duyet ca POM cha (Gradle can file POM cha de parse POM con)
        try:
            proot = ET.parse(path_of(g, a, v, pom_name)).getroot()
            par = proot.find("mvn:parent", NS)
            if par is not None:
                pg = (par.findtext("mvn:groupId", "", NS) or "").strip()
                pa = (par.findtext("mvn:artifactId", "", NS) or "").strip()
                pv = (par.findtext("mvn:version", "", NS) or "").strip()
                if pg and pa and pv and "${" not in pv and "[" not in pv:
                    queue.append((pg, pa, pv))
        except Exception:
            pass
        jar_name = f"{a}-{v}.jar"
        fetch_rel(gp, a, v, jar_name, path_of(g, a, v, jar_name))
        mod_name = f"{a}-{v}.module"
        mod_path = path_of(g, a, v, mod_name)
        if fetch_rel(gp, a, v, mod_name, mod_path):
            try:
                with open(mod_path, encoding="utf-8") as f:
                    mod = json.load(f)
                for variant in mod.get("variants", []):
                    for fobj in variant.get("files", []):
                        url = fobj.get("url")
                        # Bo qua javadoc/sources (Gradle khong can, tai rat cham)
                        if url and url != jar_name and "-javadoc" not in url and "-sources" not in url:
                            fetch_rel(gp, a, v, url, path_of(g, a, v, url))
                    for dep in variant.get("dependencies", []):
                        queue.append((dep["group"], dep["module"], dep.get("version", {}).get("requires", "")))
                    for dep in variant.get("dependencyConstraints", []):
                        queue.append((dep["group"], dep["module"], dep.get("version", {}).get("requires", "")))
            except Exception as e:
                print("module parse fail", a, e, file=sys.stderr)
        deps, _ = pom_deps(path_of(g, a, v, pom_name))
        for d in deps:
            if d[2]:
                queue.append(d)
    for g, a, v, cls in CLASSIFIERS:
        gp = g.replace(".", "/")
        name = f"{a}-{v}-{cls}.jar"
        fetch_rel(gp, a, v, name, path_of(g, a, v, name))
    print("DONE. Modules:", len(seen))


if __name__ == "__main__":
    main()
