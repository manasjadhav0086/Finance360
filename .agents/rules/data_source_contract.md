# Permanent Data Contract & BigQuery Source of Truth

This document establishes the permanent, non-negotiable data architecture and source-of-truth rules for the Finance360 Finance Dashboard.

---

## 1. BigQuery View → Dashboard Mapping (Source of Truth)

Each tab and chart must consume data strictly from its designated BigQuery view. No view substitutions, no mixing, and no recreating BigQuery grouping/business logic in JavaScript.

### Tab: Performance Tiles
| # | Component | Mapped BigQuery View | Invariant Rules |
|---|---|---|---|
| 1 | **Performance Cards** | `dataai` | Existing formulas/calculations in view must be preserved. |
| 2 | **Revenue Trend** | `RevbizWise` | Stacked period trend by Business Unit. |
| 3 | **Revenue — 12 Quarters Trend** | `dataai` | Trailing 12-quarter trend as defined in `dataai`. |
| 4 | **Order Intake Trend** | `OrderBizWise` | Stacked period trend by Business Unit. |
| 5 | **Order Intake — 12 Quarters Trend** | `OrderIntake_view` | Trailing 12-quarter trend as defined in `OrderIntake_view`. |
| 6 | **Cost % of Revenue** | `dataai` | Period ratios from `dataai`. |
| 7 | **Cost % of Revenue — 12 Quarters Trend** | `dataai` | Trailing 12-quarter cost ratios from `dataai`. |
| 8 | **Financial KPIs** | `dataai` | Period margin ratios from `dataai`. |
| 9 | **Financial KPIs — 12 Quarters Trend** | `dataai` | Trailing 12-quarter margin ratios from `dataai`. |

### Tab: Heatmap
| # | Component | Mapped BigQuery View |
|---|---|---|
| 10 | **Monthly Heatmap** | `Heatmap_monthly` |
| 11 | **Quarterly Heatmap** | `Heatmap_quarterly` |
| 12 | **Yearly Heatmap** | `Heatmap_yearly` |

### Tab: P&L Full Year
| # | Component | Mapped BigQuery View |
|---|---|---|
| 13 | **P&L Summary** | `pnlsummarydata` |

### Tab: P&L Quarterly
| # | Component | Mapped BigQuery View |
|---|---|---|
| 14 | **P&L Quarterly** | `pnlquaterly_view` |

### Tab: P&L Summary Trend
| # | Component | Mapped BigQuery View |
|---|---|---|
| 15 | **P&L Summary Trend** | `PNLSummary_trend` |

### Tab: P&L DIS Full Year
| # | Component | Mapped BigQuery View |
|---|---|---|
| 16 | **P&L DIS Full Year** | `pnldisyoy` |

### Tab: P&L DIS Quarterly
| # | Component | Mapped BigQuery View |
|---|---|---|
| 17 | **P&L DIS Quarterly** | `pnldisqoq_view` |

### Tab: P&L DIS Trend
| # | Component | Mapped BigQuery View |
|---|---|---|
| 18 | **P&L Trend** | `pnltrend` |

### Tab: KPIs
| # | Component | Mapped BigQuery View |
|---|---|---|
| 19 | **Business KPIs** | `KPI_Business` |
| 20 | **Financial KPIs** | `KPI_Financial` |

---

## 2. Business Group / Business Filter Rule

For every view where Business Group and/or Business needs to be displayed or filtered:

### Priority Hierarchy:
- **Business Group**:
  1. `segment_n` (First choice)
  2. `segment` (Fallback if `segment_n` is not available in that view)
- **Business**:
  1. `biz1_n` (First choice)
  2. `biz1` (Fallback if `biz1_n` is not available in that view)

Never assume a single naming convention across all views.

---

## 3. Business Mapping Table Rule

- The authoritative source for:
  - Business Group names
  - Business names
  - Valid Business Group ↔ Business relationships
  - Active filter dropdown options
  is the **`business_mapping`** table in BigQuery.
- **DO NOT** hardcode relationships in JavaScript.
- **DO NOT** create ad-hoc mappings in JavaScript.
- **DO NOT** infer relationships from chart data rows.

---

## 4. No Grouping Logic Changes (Strict Invariant)

All grouping, aggregation, formulas, calculations, categorization, and business logic already implemented in BigQuery views must remain **exactly** as defined in BigQuery.

The frontend must **NOT**:
1. Sum rows that are already aggregated in BigQuery.
2. Average percentages or recalculate ratios already provided by BigQuery.
3. Alter quarter/year grouping or create custom FY logic.
4. Alter metric hierarchies or metric ordering.
5. Alter business or segment grouping.
6. Alter ACT/BUD logic.
7. Move business logic from SQL/BigQuery into JavaScript.

The frontend is strictly responsible for:
1. Fetching/using the data from the correct mapped view.
2. Applying user-selected filters (Year, Quarter, Business Group, Business).
3. Displaying and rendering the data cleanly.
4. Preserving the structure/grouping provided by BigQuery.

---

## 5. Reference BigQuery Formulas (Preserved as Ground Truth)

### Table: `dataai`
- **Revenue**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Revenue',"dataai"."Mn")`
- **GP %**: `(SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Revenue',"dataai"."Mn",0))-SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A Base" LIKE '%_Dir',"dataai"."Mn",0))-SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Variable Cost',"dataai"."Mn",0)))/SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Revenue',"dataai"."Mn",0))*100`
- **Variable Cost**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Variable Cost',"dataai"."Mn")`
- **VC %**: `("dataai"."Variable Cost"/"dataai"."Revenue")*100`
- **Throughput**: `"dataai"."Revenue"-"dataai"."Variable Cost"`
- **People Cost**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'People Cost',"dataai"."Mn")`
- **Marketing Expenses**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Marketing Expenses',"dataai"."Mn")`
- **Premises**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Premise Expenses',"dataai"."Mn")`
- **Travel**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Travel Expenses',"dataai"."Mn")`
- **Telecom**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Telecom Expenses',"dataai"."Mn")`
- **Legal & Professional**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Legal & Professional',"dataai"."Mn")`
- **Administration**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Administration',"dataai"."Mn")`
- **PICA**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'PICA',"dataai"."Mn")`
- **IPR Creation**: `sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'IPR',"dataai"."Mn")`
- **Corp Allocation**: `if(round(sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Corp Allocation',"dataai"."Mn"),2) = 0,0,sum_if("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Corp Allocation',"dataai"."Mn"))`
- **Fixed Cost**: `"dataai"."Premises"+"dataai"."Travel"+"dataai"."Telecom"+"dataai"."Legal & Professional"+"dataai"."Administration"`
- **Total Opex**: `"dataai"."Variable Cost"+"dataai"."People Cost"+"dataai"."Marketing Expenses"+"dataai"."Premises"+"dataai"."Telecom"+"dataai"."Travel"+"dataai"."Legal & Professional"+"dataai"."PICA"+"dataai"."Administration"+"dataai"."Corp Allocation"`
- **EBITDA Contribution**: `"dataai"."Revenue"-"dataai"."Total Opex"`
- **EBITDA (Post Alloc. & IPR)**: `"dataai"."EBITDA Contribution"-"dataai"."Corp Allocation"`
- **EBITDA %**: `("dataai"."EBITDA (Post Alloc. & IPR)"+"dataai"."IPR Creation")/"dataai"."Revenue"`
- **Gross Profit**: `SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Revenue',"dataai"."Mn",0))-SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A Base" LIKE '%_Dir',"dataai"."Mn",0))-SUM(IF("dataai"."Nature" = 'Actuals' and "dataai"."SG&A" = 'Variable Cost',"dataai"."Mn",0))`
- **EBITDA**: `"dataai"."EBITDA (Post Alloc. & IPR)"+"dataai"."IPR Creation"`
- **EBITDA (Post Alloc. & IPR) %**: `(("dataai"."EBITDA Contribution"-"dataai"."Corp Allocation")/("dataai"."Revenue"))*100`

(And corresponding Budget variations using `Nature = 'Budget'`).

### Supporting Views
- **`Capex_view`**:
  - `CAPEX`: `sum_if("capex_view"."Nature" = 'Actual',"capex_view"."Amount")`
  - `CAPEX Budget`: `sum_if("capex_view"."Nature" = 'Budget',"capex_view"."Amount")`
- **`Collection_view`**:
  - `Collection`: `sum_if("collection_view"."Nature" = 'Actual',"collection_view"."Amount")`
  - `Collection Budget`: `sum_if("collection_view"."Nature" = 'Budget',"collection_view"."Amount")`
- **`enrollment_view`**:
  - `Enrollment`: `sum_if("enrollment_view"."Nature" = 'Actual',"enrollment_view"."Amount")`
  - `Enrollment Budget`: `sum_if("enrollment_view"."Nature" = 'Budget',"enrollment_view"."Amount")`
- **`orderintake_view`**:
  - `Order Intake`: `sum_if("orderintake_view"."Nature" = 'Actual',"orderintake_view"."Amount")`
  - `Order Intake Budget`: `sum_if("orderintake_view"."Nature" = 'Budget',"orderintake_view"."Amount")`
- **Net Cash Formula**:
  - `Net Cash` = `"Collection"-"Total Opex"+"IPR Creation"-"Capex"+"PICA"`
  - `Net Cash Budget` = `"Collection Budget"-"Total Opex Budget"+"IPR Creation Budget"-"Capex Budget"+"PICA Budget"`

---

## 6. Data Access & Missing Field Protocol

If any dashboard chart requires data not available from its mapped view:
1. **DO NOT** silently pull from another view.
2. **DO NOT** synthesize or make up calculation rules in frontend code.
3. **STOP**: Identify the missing field/data and the mapped view.
4. **REPORT** the gap and ask before introducing any alternative source or backend change.

---

## 7. Current Project Invariants (Preserved Unconditionally)

1. Frontend redesign only.
2. No PostgreSQL.
3. No authentication/login/RBAC from the ZIP.
4. No `/api/view-data` from the ZIP.
5. Preserve existing working endpoints:
   - `/api/dashboard-data`
   - `/api/ai` (Finance AI Copilot)
   - `/api/ai/brief` (Executive Brief)
   - `/api/news` (Phase 1 Live News Agent)
