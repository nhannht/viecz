# Vietnamese Student Economics Market Research Dataset

## Quick Reference

### Primary Output
```
/home/ubuntu/nhannht-projects/viecz/viecz_market_research/results/vietnamese_student_economics.json
```
- **32 data points** on student spending, income, and payment behavior
- **8 fields per point**: data_point, value, geographic_scope, source_name, source_type, data_year, source_url, citation_text
- **All values in English**, ready for "Bản mô tả" document generation
- **Validation**: Passed schema validation with all required fields complete

### Supporting Documentation
```
/home/ubuntu/nhannht-projects/viecz/viecz_market_research/RESEARCH_SUMMARY.md
```
- Executive summary with key findings
- Data organized by category (spending, income, payments, financial literacy)
- Source quality assessment
- Recommendations for Viecz business strategy

```
/home/ubuntu/nhannht-projects/viecz/viecz_market_research/DATA_SOURCES.md
```
- Complete index of 30+ sources by type
- Government, academic, industry, and international sources
- Data quality ratings and methodology notes
- 15 search queries used for research (reproducible)

## Key Findings Summary

### Student Spending
- **National average**: 2-7 million VND/month
- **TP.HCM average**: 5+ million VND/month (excluding tuition)
- **Annual education cost**: 9.5M VND/student (↑36.3% from 2022)

### Part-Time Work
- **Participation**: 22.1% of students work part-time
- **Hourly rate**: 20,000-60,000 VND/hour (market rate)
- **Monthly income**: 1-2 million VND (typical)
- **Minimum wage 2026**: 25,500 VND/hour (Zone I, TP.HCM)

### Digital Payments
- **E-wallet adoption**: ~60% of population
- **MoMo dominance**: 62% of users (31M users)
- **Usage**: 66% use weekly, 30% use daily

### Financial Literacy
- **Emergency funds**: 72.8% maintain savings
- **Overspending**: 52.2-47.8% exceed monthly income
- **Long-term planning**: Only 23.8/100 (Gen Z)

## Data Quality

✓ **High confidence sources** (Government & Academic):
  - GSO (General Statistics Office) - VHLSS 2024, 2020, 2018
  - Vietnamese Government Decrees (2025-2026)
  - World Bank and OECD analysis
  - Peer-reviewed academic papers

✓ **Medium confidence sources** (Industry Reports):
  - Statista, Mordor Intelligence, Ken Research
  - Payment service provider data
  - Market research surveys

⚠️ **Data marked [uncertain]** (10 points):
  - University-specific surveys (limited generalizability)
  - Secondary sources citing studies
  - Industry estimates
  - All clearly marked in JSON

## Research Methodology

- **15+ search queries** in English and Vietnamese
- **30+ verified sources** from government, academic, and industry
- **Data year range**: 2015-2026 (emphasis on 2022-2026)
- **Geographic coverage**: National, TP.HCM, regional, zone-based
- **Excluded**: Quora, Reddit, forums, unverified blogs

## Using the Dataset

### For Business Strategy
See `RESEARCH_SUMMARY.md` for findings organized by category and recommendations for Viecz.

### For Data Analysis
Import `vietnamese_student_economics.json` into your database or analysis tool. All data points are structured with required fields for easy processing.

### For Documentation
Each data point includes a `citation_text` field ready for use in formal documents like the "Bản mô tả" (Vietnamese market description).

### For Source Verification
See `DATA_SOURCES.md` for the complete source index with direct URLs to original sources.

## Fields in JSON

Each data point contains:
```json
{
  "data_point": "What is being measured",
  "value": "Number or range",
  "geographic_scope": "National / TP.HCM / Regional / etc",
  "source_name": "Organization that published the data",
  "source_type": "government / academic / industry_report",
  "data_year": 2024,
  "source_url": "https://...",
  "citation_text": "Ready-to-use citation (may include [uncertain] marker)"
}
```

## File Sizes

- `vietnamese_student_economics.json`: 19 KB
- `RESEARCH_SUMMARY.md`: 8.1 KB
- `DATA_SOURCES.md`: 7.8 KB
- Total research assets: ~35 KB

## Validation Status

✓ JSON structure validated
✓ All 32 data points complete
✓ All 8 required fields populated
✓ All URLs verified and active
✓ No empty or missing data
✓ Uncertain fields clearly marked

## Last Updated

Generated: **2026-03-27**
Research Quality: **High confidence** (government & academic sources prioritized)

---

For questions about specific data points, refer to the source URL and citation text provided in the JSON file.
