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
NS = {"m": "http://maven.apache.org/POM/4.0.0"}

SEED = [
    ("com.badlogicgames.gdx", "gdx", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-freetype", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-backend-lwjgl3", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-platform", "1.13.1"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.13.1"),
]
# Cac jar classifier can tai thu cong (khai trong build.gradle dang :classifier,
# hoac POM cua gdx-backend-lwjgl3 yeu cau cho LWJGL — Gradle resolve tat ca bien the natives)
CLASSIFIERS = [
    ("com.badlogicgames.gdx", "gdx-platform", "1.13.1", "natives-desktop"),
    ("com.badlogicgames.gdx", "gdx-freetype-platform", "1.13.1", "natives-desktop"),
]
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
        if not fetch(f"{base_url}/{pom_name}", path_of(g, a, v, pom_name)):
            print("MISS POM", g, a, v, file=sys.stderr)
            continue
        jar_name = f"{a}-{v}.jar"
        fetch(f"{base_url}/{jar_name}", path_of(g, a, v, jar_name))
        mod_name = f"{a}-{v}.module"
        mod_path = path_of(g, a, v, mod_name)
        if fetch(f"{base_url}/{mod_name}", mod_path):
            try:
                with open(mod_path, encoding="utf-8") as f:
                    mod = json.load(f)
                for variant in mod.get("variants", []):
                    for fobj in variant.get("files", []):
                        url = fobj.get("url")
                        if url and url != jar_name:
                            fetch(f"{base_url}/{url}", path_of(g, a, v, url))
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
        fetch(f"{BASE}/{gp}/{a}/{v}/{name}", path_of(g, a, v, name))
    print("DONE. Modules:", len(seen))


if __name__ == "__main__":
    main()
