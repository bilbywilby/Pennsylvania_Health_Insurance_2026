import urllib.request
import sys

def fetch_federal_regulation(title: str, section: str):
    url = f"https://www.ecfr.gov/api/versioner/v1/full/2026-01-01/title-{title}.xml?section={section}"
    print(f"[*] Fetching 45 CFR / 29 CFR statutory data for Section {section}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read().decode('utf-8')
            print(f"[+] Successfully retrieved {len(xml_data)} bytes of statutory text.")
            return xml_data
    except Exception as e:
        print(f"[-] Error retrieving data from eCFR API: {e}")
        return None

if __name__ == "__main__":
    print("==================================================================")
    print(" Pennsylvania Insurance Audit: Federal Statutory Fetcher Script  ")
    print("==================================================================\n")
    
    # 1. Fetch No Surprises Act IDR Regulation (45 CFR 149.510)
    nsa_text = fetch_federal_regulation(title="45", section="149.510")
    if nsa_text:
        print(f"Preview (No Surprises Act - 45 CFR 149.510):\n{nsa_text[:350]}...\n")
        
    # 2. Fetch MHPAEA Parity Regulation (29 CFR 2590.712)
    mhpaea_text = fetch_federal_regulation(title="29", section="2590.712")
    if mhpaea_text:
        print(f"Preview (Mental Health Parity - 29 CFR 2590.712):\n{mhpaea_text[:350]}...\n")
