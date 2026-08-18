# Environment Check

## Goal
Verify that the runtime can execute the analysis safely before reading user data.

## Required checks
- Python >= 3.10.
- Importability of `pandas`, `numpy`, `openpyxl`, `matplotlib`, `jinja2`, `networkx`, `charset_normalizer`, and `packaging`.
- `xlrd` is optional and only required for `.xls`.
- The requested output location is writable.
- Matplotlib can render using a non-interactive backend (`Agg`).

## Installation policy
Never install packages automatically. If a required package is missing:
1. report package name and purpose;
2. identify the current interpreter (`sys.executable`);
3. ask the user for explicit permission;
4. only after permission, use `python -m pip install -r assets/requirements.txt` with that interpreter.

If installation is impossible, explain which capabilities are blocked and continue only when a safe degraded mode exists.
