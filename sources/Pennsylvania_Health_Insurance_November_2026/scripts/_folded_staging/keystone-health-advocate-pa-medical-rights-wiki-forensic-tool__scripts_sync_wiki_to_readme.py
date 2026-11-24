#!/usr/bin/env python3
"""Wiki-to-README Sync Engine v3.0"""

import os
import json
import re
import requests
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

WIKI_HOME_URL = "https://github.com/bilbywilby/keystone-health-advocate-pa-medical-rights-wiki-forensic-tool/wiki/Home.md"
REPO_README_PATH = "README.md"

SOURCE_CACHE = {
    "pid_external_review_rate": {
        "value": "~48%",
        "source": "https://www.pa.gov/agencies/insurance/newsroom/shapiro-admin-ind-ext-review-helps-hundreds-receive-benefits-originally-denied"
    }
}

URL_FIXUPS = {
    "pahlp.org": "https://www.phlp.org",
    "[IRS 501(r)]()": "[IRS § 501(r)](https://www.irs.gov/charities-non-profits/financial-assistance-policy-and-emergency-medical-care-policy-requirements-under-section-501r)",
    "[CFPB Medical Debt]()": "[CFPB Medical Debt](https://www.consumerfinance.gov/complaint)",
    "[PA Insurance Dept]()": "[PA Insurance Department](https://www.pa.gov/agencies/insurance)"
}

class CitationValidator:
    def __init__(self):
        self.corrections: List[Dict] = []
    
    def find_empty_links(self, markdown: str) -> List[Tuple[str, int]]:
        pattern = r'\[([^\]]+)\]\(\s*\)'
        matches = []
        for i, line in enumerate(markdown.split('\n'), 1):
            for match in re.finditer(pattern, line):
                matches.append((match.group(0), i))
        return matches
    
    def repair_link(self, text: str) -> str:
        for bad, good in URL_FIXUPS.items():
            if bad in text:
                return good.replace(bad, text)
        return text

class StatCorrector:
    def correct_statistics(self, markdown: str) -> Tuple[str, List[Dict]]:
        corrections = []
        output = markdown
        
        if "53%" in output and "external review" in output.lower():
            output = output.replace("53%", "~48%")
            corrections.append({
                "field": "External Review Overturn Rate",
                "old_value": "53%",
                "new_value": "~48%",
                "source": SOURCE_CACHE["pid_external_review_rate"]["source"]
            })
        
        erisa_warning = """
> **⚠️ CRITICAL SCOPE LIMITATION:** Pennsylvania Insurance Department external review is **only available for commercial insurance** purchased directly from an insurer, through Pennie, or employer-sponsored plans that are NOT self-funded. Self-funded ERISA plans have **NO PID external review path**.
"""
        
        if "CRITICAL SCOPE LIMITATION" not in output:
            lines = output.split('\n')
            for i, line in enumerate(lines):
                if "ESCALATION" in line.upper():
                    lines.insert(i, erisa_warning)
                    corrections.append({"field": "ERISA Scope", "action": "Added disclaimer"})
                    break
            output = '\n'.join(lines)
        
        return output, corrections

class WikiToReadmeSyncer:
    def __init__(self):
        self.validator = CitationValidator()
        self.corrector = StatCorrector()
        self.generated_at = datetime.now().isoformat()
    
    def fetch_wiki_home(self) -> str:
        url = "https://raw.githubusercontent.com/wiki/bilbywilby/keystone-health-advocate-pa-medical-rights-wiki-forensic-tool/Home.md"
        response = requests.get(url, timeout=30)
        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch wiki: HTTP {response.status_code}")
        return response.text
    
    def sync(self) -> str:
        print(f"[INFO] Fetching wiki Home.md...")
        wiki_content = self.fetch_wiki_home()
        
        print("[INFO] Validating citations...")
        empty_links = self.validator.find_empty_links(wiki_content)
        if empty_links:
            print(f"[WARN] Found {len(empty_links)} empty citation links")
        
        print("[INFO] Repairing known bad links...")
        for bad_pattern, good_replacement in URL_FIXUPS.items():
            if bad_pattern in wiki_content:
                wiki_content = wiki_content.replace(bad_pattern, good_replacement)
                print(f"  ✓ Fixed: {bad_pattern}")
        
        print("[INFO] Correcting statistics...")
        wiki_content, stat_corrections = self.corrector.correct_statistics(wiki_content)
        
        # Build README
        readme_content = f"""# ⚖️ Keystone Health Advocate: Pennsylvania Medical Rights Wiki & Forensic Tool

**Auto-generated from wiki Home.md on {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}**

---

## 🔧 AUTO-CORRECTIONS APPLIED

| Field | Original Value | Corrected Value | Source |
|-------|----------------|-----------------|--------|
"""
        
        for c in stat_corrections:
            readme_content += f"| {c.get('field', 'N/A')} | {c.get('old_value', 'N/A')} | {c.get('new_value', c.get('action', 'N/A'))} | [Source]({c.get('source', '#')}) |\n"
        
        readme_content += f"""
---

## 📞 IMMEDIATE ACTION CONTACTS

| Need | Phone | Website |
|------|-------|---------|
| PA Insurance Dept | 1-866-722-6675 | https://www.pa.gov/agencies/insurance |
| CMS No Surprises | 1-800-985-3059 | https://www.cms.gov/nosurprises |
| PA Health Law Project | 1-800-274-3258 | https://www.phlp.org |

---

{wiki_content}

---

*Generated by sync_wiki_to_readme.py*
"""
        return readme_content
    
    def write_readme(self, content: str) -> None:
        with open(REPO_README_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[✓] README.md written ({len(content)} bytes)")

def main():
    syncer = WikiToReadmeSyncer()
    try:
        readme_content = syncer.sync()
        syncer.write_readme(readme_content)
        print("\n" + "=" * 60)
        print("SYNC COMPLETE")
        print("=" * 60)
        return 0
    except Exception as e:
        print(f"[✗] Sync failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
