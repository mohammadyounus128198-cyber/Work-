#!/usr/bin/env bash
set -euo pipefail

npm run analyze
python3 visualize.py
