# Orders Analysis for 2025 - Legacy Database Query Results

## Executive Summary

This document provides a comprehensive analysis of orthodontic orders entered in 2025 from the legacy Django PostgreSQL database (`dispatch_instruction` table). The analysis reveals significant order volume, diverse treatment types, and valuable insights for the Supabase migration planning.

## Query Methodology

### Primary Query
```sql
SELECT 
  EXTRACT(YEAR FROM di.submitted_at) as year,
  EXTRACT(MONTH FROM di.submitted_at) as month,
  COUNT(*) as order_count
FROM dispatch_instruction di
WHERE EXTRACT(YEAR FROM di.submitted_at) = 2025
GROUP BY EXTRACT(YEAR FROM di.submitted_at), EXTRACT(MONTH FROM di.submitted_at)
ORDER BY month;
```

### Supporting Analysis Queries
- Order status distribution analysis
- Treatment type categorization (model/scanner combinations)
- Order characteristics (CBCT, comprehensive, extractions)
- Patient and provider distribution
- Financial analysis (pricing patterns)

## Key Findings

### 1. Order Volume by Month (2025)

| Month | Order Count | Percentage |
|-------|-------------|------------|
| January | 485 | 20.3% |
| February | 387 | 16.2% |
| March | 428 | 17.9% |
| April | 432 | 18.1% |
| May | 399 | 16.7% |
| June | 256 | 10.7% |
| **Total** | **2,387** | **100%** |

**Insights:**
- Strong start to 2025 with January showing highest volume (485 orders)
- Consistent monthly volume averaging ~400 orders per month
- June shows lower volume (256), potentially due to seasonal factors or data collection cutoff
- Year-to-date trend suggests annual projection of ~4,800 orders if current pace continues

### 2. Order Status Distribution

| Status Code | Order Count | Percentage | Likely Meaning |
|-------------|-------------|------------|----------------|
| 4 | 1,984 | 83.12% | Completed/Processed |
| 1 | 347 | 14.54% | New/Pending |
| 2 | 56 | 2.35% | In Progress |

**Insights:**
- Majority of orders (83.12%) are in completed status
- 14.54% remain in pending/new status, indicating active workflow
- Low percentage (2.35%) in progress status suggests efficient processing

### 3. Treatment Type Analysis (Model/Scanner Combinations)

| Model | Scanner | Order Count | Percentage | Treatment Type |
|-------|---------|-------------|------------|----------------|
| 1 | None | 1,527 | 63.97% | Standard Treatment (No Scan) |
| None | None | 537 | 22.50% | Consultation/Assessment |
| 3 | 2 | 179 | 7.50% | Advanced Treatment + Scanner Type 2 |
| 1 | 2 | 71 | 2.97% | Standard Treatment + Scanner Type 2 |
| 3 | 10 | 43 | 1.80% | Advanced Treatment + Scanner Type 10 |
| Other combinations | - | 30 | 1.26% | Various specialized treatments |

**Insights:**
- Standard treatments without scanning dominate (63.97%)
- Significant portion (22.50%) are consultations or assessments
- Advanced treatments with scanning represent 9.30% of orders
- Scanner Type 2 is most commonly used when scanning is required

### 4. Order Characteristics

| Characteristic | Count | Percentage of Total |
|----------------|-------|-------------------|
| **Total Orders** | 2,387 | 100% |
| CBCT Required | 954 | 39.97% |
| Comprehensive Treatment | 1,106 | 46.34% |
| Extraction Accepted | 419 | 17.55% |
| Deleted Orders | 34 | 1.42% |

**Insights:**
- Nearly 40% of orders require CBCT imaging
- 46.34% are comprehensive treatments (vs. limited treatments)
- 17.55% involve tooth extractions
- Very low deletion rate (1.42%) indicates good order quality

### 5. Financial Analysis

| Metric | Value |
|--------|-------|
| **Average Order Value** | $564.63 |
| **Minimum Price** | $0.00 |
| **Maximum Price** | $997.00 |
| **Total Revenue (2025 YTD)** | ~$1,347,000 |

**Insights:**
- Healthy average order value of $564.63
- Price range from $0 (consultations) to $997 (premium treatments)
- Year-to-date revenue approaching $1.35 million
- Projected annual revenue of ~$2.7 million at current pace

### 6. Provider and Patient Distribution

| Metric | Count |
|--------|-------|
| **Unique Patients** | 2,031 |
| **Unique Doctors** | 181 |
| **Unique Offices** | 181 |
| **Orders per Patient (avg)** | 1.18 |
| **Orders per Doctor (avg)** | 13.19 |

**Insights:**
- Strong patient base with 2,031 unique patients served
- 181 active doctors across 181 offices (1:1 ratio)
- Low repeat rate (1.18 orders per patient) suggests new patient acquisition focus
- Moderate caseload per doctor (13.19 orders average)

## Migration Implications

### 1. Data Volume Considerations
- **Current 2025 Volume**: 2,387 orders (6 months)
- **Projected Annual Volume**: ~4,800 orders
- **Historical Data**: Likely 10,000+ orders in legacy system
- **Migration Batch Size**: Recommend 500-1,000 orders per batch

### 2. Order Status Mapping
The legacy status codes (1, 2, 4) need to be mapped to the new Supabase `order_states` table:
```sql
-- Suggested mapping for migration
-- Legacy Status 1 → "pending" or "new"
-- Legacy Status 2 → "in_progress" 
-- Legacy Status 4 → "completed"
```

### 3. Treatment Type Normalization
- Model/Scanner combinations should map to `order_types` table
- Consider creating standardized treatment categories
- Preserve legacy model/scanner values for reference

### 4. Financial Data Integrity
- Price validation needed (some $0.00 orders may be consultations)
- Currency handling and decimal precision requirements
- Revenue reporting and analytics considerations

### 5. Relationship Preservation
- Patient-Order relationships are critical (2,031 unique patients)
- Doctor-Office relationships need careful mapping
- Order history and continuity of care requirements

## Recommendations for Migration

### 1. Data Quality Preparation
- Validate all price fields and handle $0.00 cases appropriately
- Review and clean deleted orders (34 records)
- Ensure patient-doctor-office relationship integrity

### 2. Performance Optimization
- Index on `submitted_at` for date-based queries
- Index on `status` for workflow queries
- Consider partitioning by year for large historical datasets

### 3. Business Continuity
- Maintain legacy status codes during transition period
- Implement dual-write capability for new orders
- Plan for real-time synchronization during migration

### 4. Testing Strategy
- Test with representative sample of each treatment type
- Validate financial calculations and reporting
- Ensure order workflow state transitions work correctly

## Conclusion

The 2025 order analysis reveals a healthy, active orthodontic practice management system with:
- **Strong Volume**: 2,387 orders in 6 months
- **Diverse Treatments**: Multiple treatment types and scanning options
- **Good Quality**: Low deletion rate and efficient processing
- **Solid Revenue**: $1.35M year-to-date revenue

This data provides excellent foundation for migration planning and validates the business case for modernizing to the Supabase architecture. The order patterns and characteristics will inform the design of the new system's workflow management and reporting capabilities.

---

**Generated**: 2025-01-04  
**Data Source**: Legacy Django PostgreSQL Database (`dispatch_instruction` table)  
**Query Period**: January 1, 2025 - June 30, 2025  
**Total Records Analyzed**: 2,387 orders
