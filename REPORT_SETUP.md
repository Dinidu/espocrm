# New vs Existing Client Lead Report - Setup Guide

## Overview

This custom report extends Advanced Pack capabilities to analyze acquisition vs cross-selling by comparing:
- **Customer Segment**: New vs Existing customers
- **Product Type**: Different loan/product types
- **Metrics**: Total Leads, Converted Leads, Conversion Rate

## Installation Steps

### 1. Rebuild EspoCRM

After creating the custom report files, rebuild EspoCRM:

```bash
# In Docker container
docker exec espocrm php command.php rebuild

# Or locally
php command.php rebuild
```

### 2. Clear Cache

```bash
# In Docker container
docker exec espocrm php command.php clear-cache

# Or locally
php command.php clear-cache
```

### 3. Create Report in UI

1. Login to EspoCRM as Admin
2. Go to **Reports**
3. Click **Create Report**
4. Select:
   - **Type**: `New vs Existing Client Lead Report`
   - **Entity Type**: `Lead`
5. Configure filters (optional):
   - Date range for leads
   - Other lead criteria
6. Save the report

## Report Structure

### Columns

| Column | Description | Type |
|--------|-------------|------|
| Customer Segment | New or Existing | Text |
| Product Type | Product/loan type | Text |
| Total Leads | Count of all leads | Integer |
| Converted Leads | Count of converted leads | Integer |
| Conversion Rate | (Converted / Total) × 100 | Percentage |

### Data Logic

1. **Customer Segment Determination**:
   - Uses `cCustomerSegment` field from Lead
   - Normalizes to "New" or "Existing":
     - "New Customer" → "New"
     - "Existing Customer", "Returning Customer", "Dormant Customer Reactivation" → "Existing"

2. **Product Type**:
   - Uses `cInterestedProductType` field from Lead
   - Groups by product type (Personal Loan, Vehicle Loan, Gold Loan, etc.)

3. **Conversion Calculation**:
   - Total Leads: Count of all leads in the group
   - Converted Leads: Count of leads with `status = "Converted"`
   - Conversion Rate: (Converted Leads / Total Leads) × 100

## Customization

### Modify Segment Logic

Edit `custom/Espo/Custom/Tools/Report/NewVsExistingClientLead.php`:

```php
private function normalizeSegment(string $segment): string
{
    // Add your custom logic here
    if (stripos($segment, 'New') !== false) {
        return 'New';
    }
    // ...
}
```

### Add Additional Filters

Modify the `run()` method to add more filters:

```php
// Example: Filter by assigned user
if (isset($params->assignedUserId)) {
    $queryBuilder->where(['assignedUserId' => $params->assignedUserId]);
}
```

### Add More Metrics

Extend the report to include additional calculations:

```php
// Example: Add average lead value
'avgLeadValue' => $this->calculateAverageLeadValue($groupedLeads),
```

## File Structure

```
custom/
├── Espo/
│   ├── Custom/
│   │   ├── Services/
│   │   │   └── Report.php                    # Service override
│   │   └── Tools/
│   │       └── Report/
│   │           └── NewVsExistingClientLead.php  # Report handler
│   └── Resources/
│       ├── metadata/
│       │   ├── app/
│       │   │   └── services.json             # Service registration
│       │   └── reportTypes.json              # Report type definition
│       └── i18n/
│           └── en_US/
│               └── Report.json                # Translations

client/
└── custom/
    ├── res/
    │   └── templates/
    │       └── report/
    │           └── record/
    │               └── new-vs-existing-client-lead.tpl  # Template
    └── src/
        └── views/
            └── report/
                └── record/
                    └── new-vs-existing-client-lead.js   # View
```

## Troubleshooting

### Report Type Not Appearing

1. Check rebuild was successful:
   ```bash
   php command.php rebuild
   ```

2. Verify file permissions:
   ```bash
   chown -R www-data:www-data custom/ client/custom/
   ```

3. Check logs:
   ```bash
   tail -f data/logs/espo-*.log
   ```

### Data Not Showing

1. Verify Lead records have:
   - `cCustomerSegment` field populated
   - `cInterestedProductType` field populated
   - `status` field set correctly

2. Check ACL permissions:
   - User must have access to Lead entity
   - User must have access to Report entity

### Conversion Rate Calculation Issues

The conversion rate is calculated as:
```
Conversion Rate = (Converted Leads / Total Leads) × 100
```

If you see 0% or unexpected values:
- Verify leads have `status = "Converted"` for converted leads
- Check date filters aren't excluding all data

## Advanced Customization

### Add Date Grouping

To group by month/quarter, modify the handler:

```php
// Add date grouping logic
$month = date('Y-m', strtotime($lead->get('createdAt')));
$groupKey = $segmentKey . '|' . $productType . '|' . $month;
```

### Export to Excel/PDF

The report automatically supports Advanced Pack's export features:
- Click **Export** button in report view
- Choose format (Excel, PDF, CSV)

### Add Charts

Extend the view to add chart visualizations:

```javascript
// In new-vs-existing-client-lead.js
afterRender: function () {
    Dep.prototype.afterRender.call(this);
    this.renderChart();
}
```

## Support

For issues or questions:
1. Check EspoCRM logs: `data/logs/`
2. Enable debug mode in `data/config.php`
3. Verify Advanced Pack is installed and active

