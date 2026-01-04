# Advanced Pack Installation & Customization Guide

## Manual Installation

### Method 1: Using EspoCRM CLI (Recommended)

```bash
# Inside your Docker container or local EspoCRM installation
cd /var/www/html

# Install the extension
php command.php extension --file="extensions/advanced-pack-3.11.12.zip"

# Rebuild to apply changes
php command.php rebuild
```

### Method 2: Using the Deprecated Script

```bash
# Inside your Docker container
cd /var/www/html
php extension.php extensions/advanced-pack-3.11.12.zip
```

### Method 3: Via Admin UI

1. Login to EspoCRM as Admin
2. Go to **Administration** → **Extensions**
3. Click **Upload Extension**
4. Select `extensions/advanced-pack-3.11.12.zip`
5. Click **Install**
6. Wait for installation to complete
7. Click **Rebuild** when prompted

### Method 4: Docker Compose (Automatic)

If the extension is already in `extensions/` directory, it will be automatically installed on container startup via `init-extensions.sh`.

```bash
# Just restart the container
docker compose restart espocrm
```

## Verifying Installation

After installation, verify the extension is installed:

```bash
# Check via CLI
php command.php extension --list

# Or check in Admin UI: Administration → Extensions
```

You should see "Advanced Pack" in the list with version 3.11.12.

## Customizing Report Capabilities

### 1. Extend Report Entity Definition

Create or modify: `custom/Espo/Custom/Resources/metadata/entityDefs/Report.json`

```json
{
    "fields": {
        "customField": {
            "type": "varchar",
            "maxLength": 255,
            "isCustom": true
        }
    },
    "layouts": {
        "detail": [
            {
                "rows": [
                    [
                        {
                            "name": "customField"
                        }
                    ]
                ]
            }
        ]
    }
}
```

### 2. Create Custom Report Types

Create: `custom/Espo/Custom/Resources/metadata/reportTypes.json`

```json
{
    "CustomReportType": {
        "handlerClassName": "Espo\\Custom\\Tools\\Report\\CustomReportType",
        "view": "custom:views/report/record/custom-report-type"
    }
}
```

### 3. Create Custom Report Handler

Create: `custom/Espo/Custom/Tools/Report/CustomReportType.php`

```php
<?php

namespace Espo\Custom\Tools\Report;

use Espo\Core\Tools\Report\Type;
use Espo\ORM\EntityManager;
use Espo\Core\Utils\Metadata;
use stdClass;

class CustomReportType implements Type
{
    public function __construct(
        private EntityManager $entityManager,
        private Metadata $metadata
    ) {}

    public function run(stdClass $data, stdClass $params): stdClass
    {
        // Your custom report logic here
        $result = new stdClass();
        $result->data = [];
        $result->columns = [];
        
        return $result;
    }
}
```

### 4. Extend Report Service

Create: `custom/Espo/Custom/Services/Report.php`

```php
<?php

namespace Espo\Custom\Services;

use Espo\Services\Report as BaseReport;

class Report extends BaseReport
{
    // Override methods to add custom functionality
    public function run(string $id, ?stdClass $params = null): stdClass
    {
        $result = parent::run($id, $params);
        
        // Add your custom processing here
        // e.g., custom calculations, formatting, etc.
        
        return $result;
    }
}
```

### 5. Add Custom Report Fields/Columns

Create: `custom/Espo/Custom/Resources/metadata/fields/Report.json`

```json
{
    "customCalculatedField": {
        "type": "currency",
        "view": "custom:views/report/fields/custom-calculated-field"
    }
}
```

### 6. Custom Report Views (Frontend)

Create: `client/custom/src/views/report/record/custom-report-type.js`

```javascript
define('custom:views/report/record/custom-report-type', ['views/report/record/grid'], function (Dep) {
    return Dep.extend({
        template: 'custom:report/record/custom-report-type',
        
        setup: function () {
            Dep.prototype.setup.call(this);
            // Your custom setup
        },
        
        // Override methods to customize behavior
    });
});
```

### 7. Override Advanced Pack Report Classes

To extend Advanced Pack's report functionality, create classes in `custom/` that extend the Advanced Pack classes:

Create: `custom/Espo/Custom/Modules/AdvancedPack/Tools/Report/Grid.php`

```php
<?php

namespace Espo\Custom\Modules\AdvancedPack\Tools\Report;

use Espo\Modules\AdvancedPack\Tools\Report\Grid as BaseGrid;

class Grid extends BaseGrid
{
    // Override methods to customize grid reports
    protected function prepareColumns(array $columns): array
    {
        $columns = parent::prepareColumns($columns);
        
        // Add your custom columns or modify existing ones
        
        return $columns;
    }
}
```

### 8. Add Custom Report Filters

Create: `custom/Espo/Custom/Resources/metadata/filters/Report.json`

```json
{
    "customFilter": {
        "className": "Espo\\Custom\\Tools\\Report\\Filters\\CustomFilter"
    }
}
```

### 9. Custom Report Export Formats

Create: `custom/Espo/Custom/Tools/Report/Export/MyCustomFormat.php`

```php
<?php

namespace Espo\Custom\Tools\Report\Export;

use Espo\Tools\Report\Export\Format;

class MyCustomFormat implements Format
{
    public function export(stdClass $data, stdClass $params): string
    {
        // Your custom export logic
        return $exportedData;
    }
}
```

## File Structure for Customizations

```
custom/
├── Espo/
│   ├── Custom/
│   │   ├── Services/
│   │   │   └── Report.php              # Extend report service
│   │   ├── Tools/
│   │   │   └── Report/
│   │   │       ├── CustomReportType.php # Custom report types
│   │   │       └── Export/
│   │   │           └── MyFormat.php     # Custom export formats
│   │   └── Modules/
│   │       └── AdvancedPack/
│   │           └── Tools/
│   │               └── Report/
│   │                   └── Grid.php     # Override Advanced Pack reports
│   └── Resources/
│       └── metadata/
│           ├── entityDefs/
│           │   └── Report.json          # Report entity customization
│           ├── reportTypes.json          # Custom report types
│           └── fields/
│               └── Report.json           # Custom report fields

client/
└── custom/
    └── src/
        └── views/
            └── report/
                ├── record/
                │   └── custom-report-type.js  # Custom report views
                └── fields/
                    └── custom-field.js        # Custom field views
```

## Testing Your Customizations

1. **Rebuild after changes:**
   ```bash
   php command.php rebuild
   ```

2. **Clear cache:**
   ```bash
   php command.php clear-cache
   ```

3. **Test in UI:**
   - Go to Reports
   - Create a new report
   - Verify your customizations appear

## Common Customization Examples

### Example 1: Add Custom Calculated Column

```php
// custom/Espo/Custom/Tools/Report/CustomCalculations.php
namespace Espo\Custom\Tools\Report;

class CustomCalculations
{
    public function calculateCustomMetric(array $data): array
    {
        foreach ($data as &$row) {
            $row['customMetric'] = $row['amount'] * 1.1; // 10% markup
        }
        return $data;
    }
}
```

### Example 2: Add Custom Report Filter

```php
// custom/Espo/Custom/Tools/Report/Filters/CustomDateRange.php
namespace Espo\Custom\Tools\Report\Filters;

class CustomDateRange
{
    public function apply(array $where, array $params): array
    {
        // Your custom filter logic
        return $where;
    }
}
```

### Example 3: Override Report Data Processing

```php
// custom/Espo/Custom/Services/Report.php
public function processReportData(stdClass $data): stdClass
{
    // Add custom processing before returning
    if (isset($data->columns)) {
        foreach ($data->columns as &$column) {
            // Modify column definitions
        }
    }
    
    return $data;
}
```

## Important Notes

1. **Always rebuild after changes:**
   ```bash
   php command.php rebuild
   ```

2. **Backup before customization:**
   - Backup `custom/` directory
   - Backup database before major changes

3. **Version compatibility:**
   - Advanced Pack 3.11.12 is compatible with EspoCRM 9.2.5
   - Check compatibility when upgrading

4. **Extension updates:**
   - Customizations in `custom/` are preserved during extension updates
   - Test after updating Advanced Pack

5. **Debugging:**
   - Check logs: `data/logs/`
   - Enable debug mode in `data/config.php`:
     ```php
     'logger' => [
         'level' => 'DEBUG'
     ]
     ```

## Troubleshooting

### Extension Not Installing

```bash
# Check permissions
chown -R www-data:www-data /var/www/html/extensions
chmod 644 /var/www/html/extensions/*.zip

# Check logs
tail -f data/logs/espo-*.log
```

### Customizations Not Appearing

```bash
# Rebuild
php command.php rebuild

# Clear cache
php command.php clear-cache

# Check file permissions
chown -R www-data:www-data custom/ client/custom/
```

### Advanced Pack Features Not Available

1. Verify installation: `php command.php extension --list`
2. Check license (if required)
3. Verify user permissions
4. Rebuild: `php command.php rebuild`

