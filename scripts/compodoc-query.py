#!/usr/bin/env python3
"""CLI tool to query Angular project documentation from compodoc JSON.

Usage:
    compodoc-query.py generate              # Regenerate documentation.json
    compodoc-query.py components            # List all components
    compodoc-query.py component <name>      # Show component details (inputs, outputs, methods)
    compodoc-query.py services              # List all services
    compodoc-query.py service <name>        # Show service details (methods, dependencies)
    compodoc-query.py interfaces            # List all interfaces
    compodoc-query.py interface <name>      # Show interface fields
    compodoc-query.py routes                # List all routes
    compodoc-query.py search <term>         # Search across all symbols
    compodoc-query.py stats                 # Show project statistics
"""
import json
import subprocess
import sys
import os
from pathlib import Path

PROJ_ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = PROJ_ROOT / "web"
JSON_PATH = WEB_DIR / ".compodoc" / "documentation.json"


def generate():
    os.makedirs(JSON_PATH.parent, exist_ok=True)
    subprocess.run(
        [
            "npx", "compodoc",
            "-p", "tsconfig.json",
            "--exportFormat", "json",
            "-d", str(JSON_PATH.parent),
            "--silent",
        ],
        cwd=WEB_DIR,
        check=True,
    )
    print(f"Generated {JSON_PATH} ({JSON_PATH.stat().st_size // 1024}KB)")


def load():
    if not JSON_PATH.exists():
        print("documentation.json not found, generating...", file=sys.stderr)
        generate()
    with open(JSON_PATH) as f:
        return json.load(f)


def cmd_stats(data):
    print(f"Components:  {len(data.get('components', []))}")
    print(f"Services:    {len(data.get('injectables', []))}")
    print(f"Interfaces:  {len(data.get('interfaces', []))}")
    print(f"Pipes:       {len(data.get('pipes', []))}")
    print(f"Guards:      {len(data.get('guards', []))}")
    print(f"Directives:  {len(data.get('directives', []))}")
    print(f"Routes:      {len(data.get('routes', []))}")


def cmd_components(data):
    comps = sorted(data.get("components", []), key=lambda c: c.get("name", ""))
    for c in comps:
        inputs = len(c.get("inputsClass", []))
        outputs = len(c.get("outputsClass", []))
        sel = c.get("selector", "")
        print(f"  {c['name']:<40} {sel:<35} in={inputs} out={outputs}  {c.get('file', '')}")


def cmd_component(data, name):
    for c in data.get("components", []):
        if name.lower() in c.get("name", "").lower() or name.lower() in c.get("selector", "").lower():
            print(f"Component: {c['name']}")
            print(f"  Selector: {c.get('selector', '—')}")
            print(f"  File:     {c.get('file', '—')}")
            if c.get("description"):
                print(f"  Desc:     {c['description']}")
            if c.get("inputsClass"):
                print("  Inputs:")
                for inp in c["inputsClass"]:
                    default = f" = {inp['defaultValue']}" if inp.get("defaultValue") else ""
                    print(f"    @Input  {inp['name']}: {inp.get('type', '?')}{default}")
            if c.get("outputsClass"):
                print("  Outputs:")
                for out in c["outputsClass"]:
                    print(f"    @Output {out['name']}: {out.get('type', '?')}")
            if c.get("methodsClass"):
                print("  Methods:")
                for m in c["methodsClass"]:
                    if not m.get("name", "").startswith("ng"):
                        print(f"    {m['name']}() -> {m.get('returnType', 'void')}")
            print()


def cmd_services(data):
    svcs = sorted(data.get("injectables", []), key=lambda s: s.get("name", ""))
    for s in svcs:
        methods = len(s.get("methods", []))
        print(f"  {s['name']:<40} methods={methods}  {s.get('file', '')}")


def cmd_service(data, name):
    for s in data.get("injectables", []):
        if name.lower() in s.get("name", "").lower():
            print(f"Service: {s['name']}")
            print(f"  File: {s.get('file', '—')}")
            if s.get("description"):
                print(f"  Desc: {s['description']}")
            if s.get("methods"):
                print("  Methods:")
                for m in s["methods"]:
                    args = ", ".join(
                        f"{a.get('name', '?')}: {a.get('type', '?')}"
                        for a in m.get("args", [])
                    )
                    print(f"    {m['name']}({args}) -> {m.get('returnType', 'void')}")
            print()


def cmd_interfaces(data):
    ifaces = sorted(data.get("interfaces", []), key=lambda i: i.get("name", ""))
    for i in ifaces:
        props = len(i.get("properties", []))
        print(f"  {i['name']:<40} props={props}  {i.get('file', '')}")


def cmd_interface(data, name):
    for i in data.get("interfaces", []):
        if name.lower() in i.get("name", "").lower():
            print(f"Interface: {i['name']}")
            print(f"  File: {i.get('file', '—')}")
            if i.get("properties"):
                print("  Properties:")
                for p in i["properties"]:
                    opt = "?" if p.get("optional") else ""
                    print(f"    {p['name']}{opt}: {p.get('type', '?')}")
            print()


def cmd_routes(data):
    def print_routes(routes, indent=0):
        for r in routes:
            path = r.get("path", "")
            comp = r.get("component", r.get("loadChildren", "—"))
            prefix = "  " * indent
            print(f"{prefix}  /{path:<30} -> {comp}")
            if r.get("children"):
                print_routes(r["children"], indent + 1)
    print_routes(data.get("routes", []))


def cmd_search(data, term):
    term_lower = term.lower()
    for kind, key in [("Component", "components"), ("Service", "injectables"), ("Interface", "interfaces"), ("Pipe", "pipes")]:
        for item in data.get(key, []):
            if term_lower in item.get("name", "").lower() or term_lower in item.get("file", "").lower():
                print(f"  [{kind}] {item['name']:<40} {item.get('file', '')}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "generate":
        generate()
        return

    data = load()

    dispatch = {
        "stats": lambda: cmd_stats(data),
        "components": lambda: cmd_components(data),
        "component": lambda: cmd_component(data, sys.argv[2]) if len(sys.argv) > 2 else print("Usage: component <name>"),
        "services": lambda: cmd_services(data),
        "service": lambda: cmd_service(data, sys.argv[2]) if len(sys.argv) > 2 else print("Usage: service <name>"),
        "interfaces": lambda: cmd_interfaces(data),
        "interface": lambda: cmd_interface(data, sys.argv[2]) if len(sys.argv) > 2 else print("Usage: interface <name>"),
        "routes": lambda: cmd_routes(data),
        "search": lambda: cmd_search(data, sys.argv[2]) if len(sys.argv) > 2 else print("Usage: search <term>"),
    }

    if cmd in dispatch:
        dispatch[cmd]()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
