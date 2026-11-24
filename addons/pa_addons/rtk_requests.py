"""Pennsylvania Right-to-Know Law (RTKL) and federal FOIA request generator.

Produces primary-source requests to PA agencies so repository datasets are
refreshed from authorities rather than secondary coverage. Templates are drafting
aids; confirm each agency's current submission channel before sending.
"""
from __future__ import annotations

AGENCIES: dict[str, dict[str, str]] = {
    "pa_insurance_department": {
        "name": "Pennsylvania Insurance Department",
        "note": "Open-records officer contact published on the agency website",
    },
    "pa_department_of_health": {
        "name": "Pennsylvania Department of Health",
        "note": "Open-records officer contact published on the agency website",
    },
    "cms": {
        "name": "Centers for Medicare & Medicaid Services",
        "note": "FOIA request via CMS FOIA office",
    },
}

TEMPLATE = """REQUEST FOR PUBLIC RECORDS - Pennsylvania Right-to-Know Law (65 P.S. 67.101 et seq.)

To: Open-Records Officer, {agency}

I request access to the following records:
{records}

If any portion is denied, please cite the specific exemption relied upon and
provide a written denial per 65 P.S. 67.1106. I agree to pay reasonable fees
up to $100; notify me before exceeding that amount.

Requester:
Name: {requester}
Contact: {contact}
Date: {date}
"""


def build_request(
    agency_key: str,
    records: list[str],
    requester: str,
    contact: str,
    request_date: str,
) -> str:
    if agency_key not in AGENCIES:
        raise KeyError(f"Unknown agency: {agency_key!r}")
    agency = AGENCIES[agency_key]
    body = "\n".join(f"  {i + 1}. {rec}" for i, rec in enumerate(records))
    return TEMPLATE.format(
        agency=agency["name"],
        records=body,
        requester=requester,
        contact=contact,
        date=request_date,
    )
