# BuyBox Radar — Fit Scoring Specification

BuyBox Radar calculates a deterministic, explainable **0–100 Thesis Fit Score** for every candidate company relative to the user's defined buy-box criteria.

Scoring is implemented as pure domain functions in `server/src/domain/scoring/` with no database or network dependencies.

---

## 1. Score Components & Weights

Total possible score is **100 points**, split across six core acquisition thesis dimensions:

| # | Dimension | Max Points | Evaluation Logic |
|---|-----------|------------|------------------|
| 1 | `industry` | **25** | • **25 pts**: Exact industry match (`ind ∈ buyBox.industries`)<br>• **12 pts**: Adjacent industry (defined industry pair groups)<br>• **0 pts**: No match |
| 2 | `location` | **15** | • **0 pts**: Outside target states (`state ∉ buyBox.states`)<br>• **15 pts**: Target state match and no target cities specified, OR city is in target cities<br>• **8 pts**: Target state match, but city not in specified target cities |
| 3 | `size` | **20** | `rangeScore(employeeCount, min, max, 20)` with relative deviation tolerance ($D_{\max} = 0.5$) |
| 4 | `revenue` | **15** | `rangeScore(estimatedRevenue, min, max, 15)` with relative deviation tolerance ($D_{\max} = 0.5$) |
| 5 | `tenure` | **15** | Years in business = `currentYear - yearFounded`<br>• **0 pts**: Unknown year founded<br>• **15 pts**: `years >= minYears + 10` (strong succession signal)<br>• **10 pts**: `years >= minYears` (meets minimum threshold)<br>• **`Math.round(10 * years / minYears)`**: `years < minYears` |
| 6 | `owner` | **10** | Outreach reachability indicators:<br>• **+5 pts**: `ownerName` identified<br>• **+3 pts**: `email` available<br>• **+2 pts**: `phone` available |

---

## 2. Deviation Formula (`rangeScore`)

For numerical dimensions (`size` and `revenue`), partial credit is awarded when values fall outside the target bracket up to 50% relative deviation ($D_{\max} = 0.5$):

$$\text{Deviation } d = \begin{cases} \frac{\min - v}{\min} & \text{if } v < \min \\ \frac{v - \max}{\max} & \text{if } v > \max \end{cases}$$

$$\text{Points} = \text{round}\left( \text{maxPoints} \times \max\left(0, 1 - \frac{d}{0.5}\right) \right)$$

### Key Boundary Cases
- Value is within $[\min, \max]$: Full points ($\text{maxPoints}$).
- Value is missing / `null`: **0 points**.
- Relative deviation $d \ge 0.5$ (50% or more out of bounds): **0 points**.
- Example with 20% deviation ($d = 0.2$ on 20 max points): $20 \times (1 - 0.2/0.5) = 20 \times 0.6 = \mathbf{12\text{ pts}}$.

---

## 3. Fit Bands & Confidence Score

### Fit Bands
- **Strong fit**: `score >= 75` (Emerald badge)
- **Possible**: `50 <= score < 75` (Amber badge)
- **Weak**: `score < 50` (Slate badge)

### Data Confidence Score
Data completeness is scored independently of thesis fit:
$$\text{Confidence} = \frac{\text{Count of non-null fields among } [employees, revenue, yearFounded, ownerName, email, phone, website]}{7}$$
- **High**: $\ge 0.85$ (at least 6 of 7 fields present)
- **Medium**: $\ge 0.55$ (4 to 5 fields present)
- **Low**: $< 0.55$ (3 or fewer fields present)

*Note:* Confidence does not distort the fit score; it is displayed side-by-side to alert the searcher to data quality and serves as a secondary sort tie-break.

---

## 4. Worked Unit Test Examples

**BuyBox Criteria (BB1):**
- Industries: `['hvac']`
- States: `['TX']`, Cities: `[]`
- Employees: `10 – 50`
- Revenue: `$1,000,000 – $8,000,000`
- Min. Years in Business: `10`
- Context Year: `2026`

| Company | Profile Details | Ind | Loc | Size | Rev | Ten | Own | Total | Fit Band |
|---------|-----------------|:---:|:---:|:----:|:---:|:---:|:---:|:-----:|:--------:|
| **Company A** | HVAC, TX/Austin, 25 emp, $3.2M rev, founded 2001 (25 yrs), owner "Dana Ruiz", email, phone | 25 | 15 | 20 | 15 | 15 | 10 | **100** | **Strong** |
| **Company B** | Plumbing (adjacent), TX/Dallas, 8 emp (d=0.2), revenue null, founded 2012 (14 yrs), no owner, email only | 12 | 15 | 12 | 0 | 10 | 3 | **52** | **Possible** |
| **Company C** | HVAC, TX, 40 emp, $500K rev (d=0.5), founded 2022 (4 yrs), no owner/contact | 25 | 15 | 20 | 0 | 4 | 0 | **64** | **Possible** |

### Breakdown Arithmetic for Company B:
1. **Industry (12 / 25)**: Plumbing is adjacent to HVAC.
2. **Location (15 / 15)**: Located in target state TX with no restrictive target cities.
3. **Size (12 / 20)**: 8 employees is below min 10. Deviation $d = (10 - 8)/10 = 0.2$. Points = $\text{round}(20 \times (1 - 0.2/0.5)) = \mathbf{12}$.
4. **Revenue (0 / 15)**: Null value yields 0 points.
5. **Tenure (10 / 15)**: 14 years in business meets 10-year minimum, but under the 20-year succession bonus ($10+10$).
6. **Owner (3 / 10)**: Email present (+3), no owner name, no phone.
7. **Total**: $12 + 15 + 12 + 0 + 10 + 3 = \mathbf{52}$ (Possible fit).

---

## 5. Explainable Reason Templates

Every scored lead provides a human-readable explanation for each component:

| Component | Condition | Reason String Template |
|-----------|-----------|------------------------|
| `industry` | Exact match | `Exact industry match (${label})` |
| | Adjacent | `Adjacent industry (${label})` |
| | None | `Outside target industries (${label})` |
| `location` | No cities specified, state match | `In target state (${state})` |
| | City match | `In target city (${city})` |
| | State match, outside target cities | `In target state (${state}), outside target cities` |
| | Outside states | `Outside target states (${state})` |
| `size` | Unknown | `Employee count unknown` |
| | Within range | `${n} employees — within ${min}–${max}` |
| | Below range ($d < 0.5$) | `${n} employees — ${pct}% below minimum (${min})` |
| | Above range ($d < 0.5$) | `${n} employees — ${pct}% above maximum (${max})` |
| | Far out of range ($d \ge 0.5$) | `${n} employees — far ${below\|above} target range` |
| `revenue` | Unknown | `Revenue unknown` |
| | Within range | `Est. revenue ${fmtUsd(v)} — within ${fmtUsd(min)}–${fmtUsd(max)}` |
| | Out of range ($d < 0.5$) | `Est. revenue ${fmtUsd(v)} — ${pct}% below minimum / above maximum` |
| | Far out of range ($d \ge 0.5$) | `Est. revenue ${fmtUsd(v)} — far ${below\|above} target range` |
| `tenure` | Unknown | `Year founded unknown` |
| | $\ge \min + 10$ | `${years} yrs in business (≥${min+10} — strong succession signal)` |
| | $\ge \min$ | `${years} yrs in business (meets ${min}-yr minimum)` |
| | $< \min$ | `${years} yrs in business (below ${min}-yr minimum)` |
| `owner` | Any contact data | Joined parts: `Owner identified (${owner}) · Email available · Phone available` |
| | None | `No owner or contact data` |
