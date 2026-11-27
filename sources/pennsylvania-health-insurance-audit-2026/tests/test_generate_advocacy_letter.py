#!/usr/bin/env python3

"""
Unit Tests for Advocacy Letter Generator CLI
Validates argument parsing, letter generation, and output formatting.
"""

import unittest
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))


class TestAdvocacyLetterGenerator(unittest.TestCase):
    """Tests for generate_advocacy_letter.py functionality"""

    @classmethod
    def setUpClass(cls):
        """Import the module once for all tests."""
        from generate_advocacy_letter import (
            generate_act42_sep,
            generate_act54_subsidy_appeal,
            generate_miar_eligibility_appeal,
            generate_minor_confidentiality_request,
            LetterContext
        )
        cls.generator = sys.modules['generate_advocacy_letter']
        cls.LetterContext = LetterContext

    def test_act42_letter_structure(self):
        """Verifies Act 42 SEP letter contains required statutory elements."""
        ctx = self.LetterContext(
            patient_name="Jane Doe",
            insurer_name="Pennie",
            identifier="PENN-998231",
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            details={"barrier_description": "portal outage"}
        )
        letter = self.generator.generate_act42_sep(ctx)

        self.assertIn("Act 42 of 2019", letter)
        self.assertIn("Special Enrollment Period", letter)
        self.assertIn("PENN-998231", letter)
        self.assertIn("Jane Doe", letter)

    def test_act42_custom_barrier_preserved(self):
        """Verifies custom barrier descriptions are injected correctly."""
        ctx = self.LetterContext(
            patient_name="Test Patient",
            insurer_name="Pennie",
            identifier="TEST-123",
            date="2026-10-11",
            details={"barrier_description": "custom technical failure description"}
        )
        letter = self.generator.generate_act42_sep(ctx)

        self.assertIn("custom technical failure description", letter)

    def test_act54_letter_structure(self):
        """Verifies Act 54 hardship letter contains affordability framework references."""
        ctx = self.LetterContext(
            patient_name="John Smith",
            insurer_name="Pennie",
            identifier="PENN-445192",
            date="2026-10-11",
            details={"hardship_reason": "job loss"}
        )
        letter = self.generator.generate_act54_subsidy_appeal(ctx)

        self.assertIn("Act 54 of 2024", letter)
        self.assertIn("MAGI", letter)
        self.assertIn("Cost-Sharing Reduction", letter)
        self.assertIn("job loss", letter)

    def test_act54_default_hardship_used_when_missing(self):
        """Verifies default hardship reason when not provided."""
        ctx = self.LetterContext(
            patient_name="Test Patient",
            insurer_name="Pennie",
            identifier="TEST-123",
            date="2026-10-11",
            details={}  # No hardship_reason key
        )
        letter = self.generator.generate_act54_subsidy_appeal(ctx)

        self.assertIn("involuntary reduction in household income", letter)

    def test_miar_letter_structure(self):
        """Verifies MIAR appeal letter contains required federal regulatory citations."""
        ctx = self.LetterContext(
            patient_name="Alice Johnson",
            insurer_name="CMS",
            identifier="CMS-883102",
            date="2026-10-11",
            details={
                "notice_date": "October 1, 2026",
                "discrepancy_type": "income verification",
                "evidence_provided": "tax transcripts"
            }
        )
        letter = self.generator.generate_miar_eligibility_appeal(ctx)

        self.assertIn("Marketplace Integrity and Affordability Rule", letter)
        self.assertIn("45 C.F.R. § 155.320", letter)
        self.assertIn("October 1, 2026", letter)

    def test_miar_all_details_injected(self):
        """Verifies all MIAR custom fields are properly interpolated."""
        ctx = self.LetterContext(
            patient_name="Test Patient",
            insurer_name="CMS",
            identifier="TEST-123",
            date="2026-10-11",
            details={
                "notice_date": "Custom Notice Date",
                "discrepancy_type": "citizenship verification",
                "evidence_provided": "certified birth certificate"
            }
        )
        letter = self.generator.generate_miar_eligibility_appeal(ctx)

        self.assertIn("Custom Notice Date", letter)
        self.assertIn("citizenship verification", letter)
        self.assertIn("certified birth certificate", letter)

    def test_minor_letter_structure(self):
        """Verifies minor confidentiality letter cites correct Pennsylvania statutes."""
        ctx = self.LetterContext(
            patient_name="Teen Patient",
            insurer_name="Highmark Blue Shield",
            identifier="GRP-11223344",
            date="2026-10-11",
            details={
                "dob": "05/14/2010",
                "confidential_address": "Safe Harbor Way"
            }
        )
        letter = self.generator.generate_minor_confidentiality_request(ctx)

        self.assertIn("35 P.S. § 10101", letter)
        self.assertIn("35 P.S. § 10101.1", letter)
        self.assertIn("Explanation of Benefits", letter)
        self.assertIn("05/14/2010", letter)

    def test_minor_letter_no_default_values_override(self):
        """Verifies confidential address overrides defaults."""
        ctx = self.LetterContext(
            patient_name="Minor Patient",
            insurer_name="Test Insurer",
            identifier="TEST-123",
            date="2026-10-11",
            details={"confidential_address": "Secure Location XXX"}
        )
        letter = self.generator.generate_minor_confidentiality_request(ctx)

        self.assertIn("Secure Location XXX", letter)

    def test_letter_context_is_dataclass(self):
        """Verifies LetterContext uses dataclass pattern correctly."""
        ctx = self.LetterContext(
            patient_name="Test",
            insurer_name="Test",
            identifier="TEST-123",
            date="2026-10-11",
            details={"key": "value"}
        )

        self.assertEqual(ctx.patient_name, "Test")
        self.assertEqual(ctx.identifier, "TEST-123")
        self.assertIn("key", ctx.details)

    def test_letter_contains_required_headers(self):
        """Verifies all letters include date and salutation sections."""
        ctx = self.LetterContext(
            patient_name="Test",
            insurer_name="Test",
            identifier="TEST-123",
            date="2026-10-11",
            details={}
        )

        letters = [
            self.generator.generate_act42_sep(ctx),
            self.generator.generate_act54_subsidy_appeal(ctx),
            self.generator.generate_miar_eligibility_appeal(ctx),
            self.generator.generate_minor_confidentiality_request(ctx)
        ]

        for letter in letters:
            self.assertIn("2026-10-11", letter)
            self.assertIn("To Whom It May Concern", letter)
            self.assertIn("Sincerely", letter)


class TestCLIArgumentParsing(unittest.TestCase):
    """Tests for command-line argument parsing"""

    def test_required_arguments(self):
        """Verifies --law, --patient, --id are required."""
        result = subprocess.run(
            [sys.executable, "scripts/generate_advocacy_letter.py", "--help"],
            capture_output=True,
            text=True
        )
        self.assertIn("--law", result.stdout)
        self.assertIn("--patient", result.stdout)
        self.assertIn("--id", result.stdout)

    def test_law_choices_valid(self):
        """Verifies valid law choices are accepted."""
        valid_choices = ["act42", "act54", "miar", "minor"]
        for law in valid_choices:
            result = subprocess.run(
                [sys.executable, "scripts/generate_advocacy_letter.py",
                 "--law", law, "--patient", "Test", "--id", "TEST"],
                capture_output=True,
                text=True,
                cwd=str(Path(__file__).parent.parent)
            )
            self.assertEqual(result.returncode, 0)

    def test_detail_key_value_parsing(self):
        """Verifies --detail key=value parsing works correctly."""
        result = subprocess.run(
            [sys.executable, "scripts/generate_advocacy_letter.py",
             "--law", "act54", "--patient", "Test", "--id", "TEST",
             "--detail", "hardship_reason=test_hardship"],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent)
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("test_hardship", result.stdout)

    def test_insurer_parameter_defaults_correctly(self):
        """Verifies --insurer defaults when not provided."""
        result = subprocess.run(
            [sys.executable, "scripts/generate_advocacy_letter.py",
             "--law", "minor", "--patient", "Test", "--id", "TEST"],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent)
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("Pennie / Health Plan", result.stdout)  # Default value

    def test_date_default_to_today_utc(self):
        """Verifies --date defaults to current UTC date."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        result = subprocess.run(
            [sys.executable, "scripts/generate_advocacy_letter.py",
             "--law", "act42", "--patient", "Test", "--id", "TEST"],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent)
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn(today, result.stdout)


class TestEdgeCases(unittest.TestCase):
    """Tests for edge cases and error handling"""

    @classmethod
    def setUpClass(cls):
        from generate_advocacy_letter import LetterContext
        cls.generator = sys.modules['generate_advocacy_letter']
        cls.LetterContext = LetterContext

    def test_empty_details_dict_handled(self):
        """Verifies letters work with empty details dict."""
        ctx = self.LetterContext(
            patient_name="Test",
            insurer_name="Test",
            identifier="TEST",
            date="2026-10-11",
            details={}
        )

        # Should not raise KeyError
        letter = self.generator.generate_act42_sep(ctx)
        self.assertIn("standard", letter)  # Default text used

    def test_unicode_characters_preserved(self):
        """Verifies special characters in patient names are handled."""
        ctx = self.LetterContext(
            patient_name="José María García",
            insurer_name="Test",
            identifier="TEST",
            date="2026-10-11",
            details={}
        )

        letter = self.generator.generate_act54_subsidy_appeal(ctx)
        self.assertIn("José María García", letter)

    def test_long_text_doesnt_truncate(self):
        """Verifies very long detail descriptions are fully included."""
        long_text = "A" * 500
        ctx = self.LetterContext(
            patient_name="Test",
            insurer_name="Test",
            identifier="TEST",
            date="2026-10-11",
            details={"barrier_description": long_text}
        )

        letter = self.generator.generate_act42_sep(ctx)
        self.assertIn(long_text, letter)

    def test_letter_has_no_placeholder_remnants(self):
        """Verifies no unpopulated placeholder text remains."""
        ctx = self.LetterContext(
            patient_name="Test Patient",
            insurer_name="Test Insurer",
            identifier="TEST-123",
            date="2026-10-11",
            details={}
        )

        letters = [
            self.generator.generate_act42_sep(ctx),
            self.generator.generate_act54_subsidy_appeal(ctx),
            self.generator.generate_miar_eligibility_appeal(ctx),
            self.generator.generate_minor_confidentiality_request(ctx)
        ]

        for letter in letters:
            # Common placeholder patterns that should NOT appear
            self.assertNotIn("PLACEHOLDER", letter.upper())
            self.assertNotIn("[", letter)  # No unpopulated brackets
            self.assertNotIn("{}", letter)


if __name__ == '__main__':
    unittest.main()
