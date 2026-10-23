#!/usr/bin/env python3
"""Tai cay dependency TeaVM (backend-teavm 1.2.4 + TeaVM 0.12.3 + freetype-teavm)
vao ./local-maven, tai dung logic BFS cua fetch_deps.py. Chay: python3 tools/fetch_deps_teavm.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_deps

fetch_deps.SEED = [
    ("com.github.xpenatan.gdx-teavm", "backend-teavm", "1.2.4"),
    ("com.github.xpenatan.gdx-teavm", "asset-loader", "1.2.4"),
    ("com.github.xpenatan.gdx-teavm", "gdx-freetype-teavm", "1.2.4"),
]

if __name__ == "__main__":
    fetch_deps.main()
