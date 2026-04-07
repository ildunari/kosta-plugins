
#!/usr/bin/env python3
"""
refactor_suggester.py
Suggest stepwise refactors from MVC→MVVM→TCA (or toward Clean/VIPER) based on heuristics.
"""
import os, json, argparse, re

def load_analysis(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def detect_mvc_signs(project_root):
    # naive: view controllers directly calling URLSession / CoreData, no ViewModels, heavy storyboards
    mvc_signs = []
    for dirpath, _, files in os.walk(project_root):
        for fn in files:
            if fn.endswith(".swift"):
                full = os.path.join(dirpath, fn)
                txt = open(full, "r", encoding="utf-8", errors="ignore").read()
                if "UIViewController" in txt and ("URLSession" in txt or "CoreData" in txt):
                    mvc_signs.append(full)
    return mvc_signs

def suggestions_for_target(target):
    if target == "mvvm":
        return [
            "Introduce ViewModels per screen; move API calls out of ViewControllers.",
            "Adopt Coordinators to encapsulate navigation logic.",
            "Introduce Repository protocols to abstract data sources.",
            "Write ViewModel unit tests for input/output mapping."
        ]
    if target == "tca":
        return [
            "Select a leaf feature; define State, Action, Reducer and wrap the screen in a Store.",
            "Model side effects as Effects using async/await; inject dependencies.",
            "Compose child features; migrate navigation to state-driven flows.",
            "Use TestStore to pin reducer behavior."
        ]
    if target == "clean":
        return [
            "Create Domain layer with Entities and UseCases depending on Repository protocols.",
            "Move framework code to Presentation/Data; keep Domain pure.",
            "Implement Data sources behind Repositories; wire via DI.",
            "Add contract tests for Repositories and UseCases."
        ]
    if target == "viper":
        return [
            "Split screen into View/Interactor/Presenter/Router components.",
            "Define protocols for each boundary; add a ModuleBuilder.",
            "Move navigation into Router; keep Presenter passive.",
            "Unit test Presenter and Interactor rules."
        ]
    return []

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", required=True, help="Path to project root")
    ap.add_argument("--analysis", help="Optional path to architecture_report.json from architecture_analyzer.py")
    ap.add_argument("--target", choices=["mvvm", "tca", "clean", "viper"], required=True)
    args = ap.parse_args()

    analysis = load_analysis(args.analysis) if args.analysis else None
    mvc = detect_mvc_signs(args.path)

    plan = {
        "target": args.target,
        "inputs": {
            "analysis": analysis is not None,
            "mvc_signs_found": len(mvc)
        },
        "steps": []
    }

    plan["steps"].extend(suggestions_for_target(args.target))

    if mvc:
        plan["steps"].insert(0, f"Found {len(mvc)} UIViewControllers with direct data access. Extract services/VMs first.")
        plan["hotspots"] = mvc

    if analysis and analysis.get("layer_violations"):
        plan["steps"].insert(1, "Resolve layer violations by moving Data code out of UI/Domain files and behind protocols.")

    print(json.dumps(plan, indent=2))

if __name__ == "__main__":
    main()
