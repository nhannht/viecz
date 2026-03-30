# Python: ALWAYS use uv venv

**NEVER run `pip install` or `pip3 install` directly.** System Python is externally managed (PEP 668).

## Rule

1. Create a `uv venv` before installing any Python package
2. Use `uv pip install` inside the venv
3. No exceptions

## Project venvs

| Purpose | Path |
|---------|------|
| Notebooks | `notebooks/.venv/` |
| Temp/one-off scripts | `/tmp/<name>-env/` (e.g. `/tmp/docx-env/`) |

## Example

```bash
cd /tmp && uv venv my-env && source my-env/bin/activate && uv pip install <package>
/tmp/my-env/bin/python script.py
```
