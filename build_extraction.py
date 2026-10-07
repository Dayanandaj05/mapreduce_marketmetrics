import csv
import json

def read_file(path):
    try:
        with open(path, "r") as f: return f.read()
    except: return "NOT FOUND"

def main():
    out = []
    out.append("# Source Manifest")
    out.append("- /Users/dayananda/armory_project/references/00_PROJECT_OVERVIEW.md")
    out.append("- /Users/dayananda/armory_project/references/01_SOP_WORKBOOK.md")
    out.append("- /Users/dayananda/armory_project/references/02_PRESENTATIONS.md")
    out.append("- /Users/dayananda/armory_project/references/04_AGENTIC_AI_TEST_HARNESS.md")
    out.append("- /Users/dayananda/armory_project/references/05_ARMORY_REAL_EVALUATION.md")
    out.append("- /Users/dayananda/armory_project/references/03_TOOL_TESTING_ART_GUARDRAILS_ARMORY.md")
    out.append("- /Users/dayananda/art_project/evasion_attack.py")
    out.append("- /Users/dayananda/guardrails_project/test_guardrails.py")
    out.append("- /Users/dayananda/armory_project/test_armory.py")
    out.append("- /Users/dayananda/agent_project/agent_core.py")
    out.append("- /Users/dayananda/agent_project/tools.py")
    out.append("- /Users/dayananda/agent_project/test_cases.py")
    out.append("- /Users/dayananda/agent_project/test_runner.py")
    out.append("- /Users/dayananda/agent_project/findings_export.csv")
    out.append("- /Users/dayananda/mini_demo/demo/recordings/stage4_1790601732.txt")
    out.append("\n**Items Not Found:**")
    out.append("- Existing System verbatim text (only references to it exist).")
    out.append("- Literature Review verbatim text (only citations exist).")
    out.append("- System Flow description/diagram steps (diagram referenced but text not found).")
    out.append("- Full 9-test-case run console output (only the summary and CSV were found).")
    out.append("")

    # We will build the markdown using string formatting
    
    md = "\n".join(out)
    
    with open("EXTRACTION_PACKAGE.md", "w") as f:
        f.write(md)

if __name__ == '__main__':
    main()
