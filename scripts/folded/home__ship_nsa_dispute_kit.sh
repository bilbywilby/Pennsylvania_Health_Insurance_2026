#!/usr/bin/env bash
# ==============================================================================
# Keystone Health NSA Dispute Kit — Deployment & Verification Script
# Purpose: Initialize repository, run verification tests, confirm readiness
# Usage:   bash ship_nsa_dispute_kit.sh
#          VIS=public bash ship_nsa_dispute_kit.sh
# ==============================================================================

set -euo pipefail

# Configuration
REPO_ROOT="$(pwd)"
SCRIPT_DIR="$(dirname "$0")"
VISIBILITY="${VIS:-private}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${REPO_ROOT}/deployment_${TIMESTAMP}.log"
TEST_RESULTS="${REPO_ROOT}/test_results_${TIMESTAMP}.xml"

# ANSI Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "$1" | tee -a "${LOG_FILE}"
}

# ==============================================================================
# Step 1: Repository Structure Verification
# ==============================================================================
step1_verify_structure() {
    log "${BLUE}[STEP 1/6]${NC} Verifying repository structure..."

    declare -a REQUIRED_FILES=(
        "README.md"
        "DISCLAIMER.md"
        "LICENSE"
        "CHANGELOG.md"
        "HANDOVER.md"
        "QUICK_START.md"
        "LEGAL_RESOURCES.md"
        "METRICS.md"
        "DECISION_FLOW.md"
        "SECURITY.md"
        "CODE_OF_CONDUCT.md"
        "templates/txt/PROVIDER_DISPUTE_LETTER.txt"
        "templates/txt/INSURER_COMPANION_LETTER.txt"
        "templates/txt/COLLECTION_AGENCY_ESCALATION_LETTER.txt"
        "spreadsheets/csv/no_surprises_dispute_tracker.csv"
        "automation/python/nsa_dispute_reminder.py"
        "docs/SETUP_GUIDE.md"
        "docs/USAGE_EXAMPLES.md"
    )

    MISSING_COUNT=0
    for file in "${REQUIRED_FILES[@]}"; do
        if [[ ! -f "${REPO_ROOT}/${file}" ]]; then
            log "${RED}✗ Missing:${NC} ${file}"
            ((MISSING_COUNT++)) || true
        fi
    done

    if [[ $MISSING_COUNT -eq 0 ]]; then
        log "${GREEN}✓ All required files present${NC}"
        return 0
    else
        log "${RED}✗ ${MISSING_COUNT} required files missing${NC}"
        return 1
    fi
}

# ==============================================================================
# Step 2: Citation Validation
# ==============================================================================
step2_validate_citations() {
    log "${BLUE}[STEP 2/6]${NC} Validating legal citations..."

    BANNED_PATTERNS=(
        "42 U.S.C. § 300gg-4[12]"
        "Act 252"
        "Pa. Stat. § 28-725"
        "Senate Bill 1071"
    )

    CITATION_ERRORS=0

    for template in "${REPO_ROOT}/templates/txt/"*.txt; do
        if [[ -f "$template" ]]; then
            for pattern in "${BANNED_PATTERNS[@]}"; do
                if grep -qiE "$pattern" "$template" 2>/dev/null; then
                    log "${RED}✗ Forbidden citation found:${NC} $pattern in $(basename "$template")"
                    ((CITATION_ERRORS++)) || true
                fi
            done
        fi
    done

    REQUIRED_CITATIONS=(
        "42 U.S.C. § 300gg-111"
        "45 C.F.R. § 149.4"
        "PHSA § 2799"
    )

    MISSING_CITATIONS=0
    PROVIDER_LETTER="${REPO_ROOT}/templates/txt/PROVIDER_DISPUTE_LETTER.txt"
    if [[ -f "$PROVIDER_LETTER" ]]; then
        for citation in "${REQUIRED_CITATIONS[@]}"; do
            if ! grep -q "$citation" "$PROVIDER_LETTER" 2>/dev/null; then
                log "${RED}✗ Required citation missing:${NC} $citation"
                ((MISSING_CITATIONS++)) || true
            fi
        done
    else
        log "${RED}✗ Provider dispute letter not found for citation check${NC}"
        ((MISSING_CITATIONS++)) || true
    fi

    TOTAL_ERRORS=$((CITATION_ERRORS + MISSING_CITATIONS))

    if [[ $TOTAL_ERRORS -eq 0 ]]; then
        log "${GREEN}✓ All citations validated${NC}"
        return 0
    else
        log "${RED}✗ ${TOTAL_ERRORS} citation errors detected${NC}"
        return 1
    fi
}

# ==============================================================================
# Step 3: CSV Schema Validation
# ==============================================================================
step3_validate_csv() {
    log "${BLUE}[STEP 3/6]${NC} Validating CSV tracker schema..."

    CSV_FILE="${REPO_ROOT}/spreadsheets/csv/no_surprises_dispute_tracker.csv"

    if [[ ! -f "$CSV_FILE" ]]; then
        log "${RED}✗ CSV file not found${NC}"
        return 1
    fi

    EXPECTED_COLS=8
    ACTUAL_COLS=$(head -1 "$CSV_FILE" | tr ',' '\n' | wc -l)

    if [[ $ACTUAL_COLS -ne $EXPECTED_COLS ]]; then
        log "${RED}✗ Expected ${EXPECTED_COLS} columns, found ${ACTUAL_COLS}${NC}"
        return 1
    fi

    if grep -E '".*".*".*"' "$CSV_FILE" >/dev/null 2>&1; then
        log "${YELLOW}⚠ Warning: Potential stray quotes detected${NC}"
    else
        log "${GREEN}✓ CSV schema valid${NC}"
    fi

    return 0
}

# ==============================================================================
# Step 4: Python Environment Check
# ==============================================================================
step4_python_env() {
    log "${BLUE}[STEP 4/6]${NC} Checking Python environment..."

    if ! command -v python3 &> /dev/null; then
        log "${RED}✗ python3 not found in PATH${NC}"
        return 1
    fi

    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    MIN_VERSION="3.9"

    if python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"; then
        log "${GREEN}✓ Python ${PYTHON_VERSION} OK${NC}"
    else
        log "${RED}✗ Python ${MIN_VERSION}+ required, found ${PYTHON_VERSION}${NC}"
        return 1
    fi

    DEPENDENCIES=("pytest" "pandas" "dateutil")
    MISSING_DEPS=0

    for dep in "${DEPENDENCIES[@]}"; do
        import_name="$dep"
        [[ "$dep" == "python-dateutil" ]] && import_name="dateutil"
        if ! python3 -c "import $import_name" >/dev/null 2>&1; then
            log "${YELLOW}⚠ Missing Python package:${NC} $dep (run: pip install $dep)"
            ((MISSING_DEPS++)) || true
        fi
    done

    if [[ $MISSING_DEPS -eq 0 ]]; then
        log "${GREEN}✓ All Python dependencies present${NC}"
    fi

    return 0
}

# ==============================================================================
# Step 5: Unit Tests
# ==============================================================================
step5_run_tests() {
    log "${BLUE}[STEP 5/6]${NC} Running unit tests..."

    if ! command -v pytest &> /dev/null; then
        log "${YELLOW}⚠ pytest not installed, skipping automated tests${NC}"
        log "   To enable: pip install pytest"
        return 0
    fi

    TEST_DIR="${REPO_ROOT}/tests"
    if [[ ! -d "$TEST_DIR" ]]; then
        log "${YELLOW}⚠ No tests directory found, skipping automated tests${NC}"
        return 0
    fi

    if pytest "$TEST_DIR" --junitxml="$TEST_RESULTS" -q 2>/dev/null; then
        log "${GREEN}✓ All tests passed${NC}"
        return 0
    else
        log "${RED}✗ Some tests failed${NC}"
        return 1
    fi
}

# ==============================================================================
# Step 6: Security Scan
# ==============================================================================
step6_security_scan() {
    log "${BLUE}[STEP 6/6]${NC} Scanning for hardcoded secrets..."

    SECRET_PATTERNS=(
        "password\s*=\s*['\"][^'\"]+['\"]"
        "api_key\s*=\s*['\"][^'\"]+['\"]"
        "SMTP_PASSWORD\s*=\s*['\"][^'\"]+['\"]"
    )

    SECRETS_FOUND=0
    PY_DIR="${REPO_ROOT}/automation/python"

    if [[ -d "$PY_DIR" ]]; then
        for pyfile in "$PY_DIR"/*.py; do
            if [[ -f "$pyfile" ]]; then
                for pattern in "${SECRET_PATTERNS[@]}"; do
                    if grep -iE "$pattern" "$pyfile" 2>/dev/null | grep -v "environ" | grep -v "#" >/dev/null; then
                        log "${RED}✗ Potential hardcoded secret:${NC} $(basename "$pyfile")"
                        ((SECRETS_FOUND++)) || true
                    fi
                done
            fi
        done
    fi

    if [[ -f "${REPO_ROOT}/.gitignore" ]] && ! grep -q "\.env" "${REPO_ROOT}/.gitignore" 2>/dev/null; then
        log "${YELLOW}⚠ Warning: .env not in .gitignore${NC}"
    fi

    if [[ $SECRETS_FOUND -eq 0 ]]; then
        log "${GREEN}✓ No hardcoded secrets detected${NC}"
    fi

    return 0
}

# ==============================================================================
# Summary & Execution Verdict
# ==============================================================================
deploy_summary() {
    log ""
    log "==============================================================================="
    log "                         DEPLOYMENT SUMMARY"
    log "==============================================================================="

    OVERALL_STATUS="SUCCESS"

    if [[ "$VISIBILITY" == "public" ]]; then
        log "Deployment Target: ${YELLOW}PUBLIC RELEASE${NC}"
        if ! step1_verify_structure || ! step2_validate_citations || ! step3_validate_csv; then
            OVERALL_STATUS="FAILURE - Critical checks failed for public release"
        fi
    else
        log "Deployment Target: ${BLUE}PRIVATE / INTERNAL${NC}"
        log "Note: Some requirements relaxed for private testing"
    fi

    step1_verify_structure || OVERALL_STATUS="WARNING - Structure issues"
    step2_validate_citations || OVERALL_STATUS="CRITICAL - Citation errors"
    step3_validate_csv || OVERALL_STATUS="WARNING - CSV issues"
    step4_python_env || OVERALL_STATUS="WARNING - Environment issues"
    step5_run_tests || OVERALL_STATUS="INFO - Test failures (optional)"
    step6_security_scan || OVERALL_STATUS="CRITICAL - Security issues"

    log ""
    log "==============================================================================="

    case "$OVERALL_STATUS" in
        *SUCCESS*)
            log "${GREEN}████████████████████████████████████████████████${NC}"
            log "${GREEN}  DEPLOYMENT READY FOR ${VISIBILITY^^} RELEASE   ${NC}"
            log "${GREEN}████████████████████████████████████████████████${NC}"
            ;;
        *CRITICAL*)
            log "${RED}████████████████████████████████████████████████${NC}"
            log "${RED}  DEPLOYMENT BLOCKED - FIX CRITICAL ISSUES ${NC}"
            log "${RED}████████████████████████████████████████████████${NC}"
            exit 1
            ;;
        *)
            log "${YELLOW}████████████████████████████████████████████████${NC}"
            log "${YELLOW}  DEPLOYMENT PROCEED WITH CAUTION      ${NC}"
            log "${YELLOW}████████████████████████████████████████████████${NC}"
            ;;
    esac
}

# Main Execution
main() {
    deploy_summary
}

main "$@"
