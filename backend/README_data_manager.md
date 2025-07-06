# Car Collection Data Manager

This tool provides easy data export/import functionality for the Car Collection database, making testing and data management much more efficient.

## Features

- **Export**: Save all database data to CSV files
- **Import**: Load data from CSV files back to the database
- **Clear**: Remove all data from the database
- **Validate**: Check CSV files for errors before importing

## Usage

### Export Data to CSV

Export all current database data to CSV files:

```bash
cd backend
source venv/bin/activate
python data_manager.py export
```

This creates:
- `data/cars.csv` - All car records
- `data/todos.csv` - All todo records  
- `data/metadata.json` - Export metadata

### Import Data from CSV

Import data from CSV files (clears existing data by default):

```bash
python data_manager.py import
```

To import without clearing existing data:

```bash
python data_manager.py import --no-clear
```

### Clear Database

Remove all data from the database:

```bash
python data_manager.py clear
```

### Validate CSV Files

Check CSV files for errors without importing:

```bash
python data_manager.py validate
```

## CSV File Format

### cars.csv
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | No | Auto-generated ID |
| year | Integer | Yes | Car year (1900-current) |
| make | String | Yes | Car manufacturer |
| model | String | Yes | Car model |
| vin | String | No | Vehicle identification number |
| mileage | Integer | No | Current mileage |
| license_plate | String | No | License plate number |
| insurance_info | String | No | Insurance policy info |
| notes | String | No | Additional notes |
| created_at | DateTime | No | Auto-generated timestamp |
| updated_at | DateTime | No | Auto-generated timestamp |

### todos.csv
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | No | Auto-generated ID |
| car_id | Integer | Yes | ID of the car this todo belongs to |
| title | String | Yes | Todo title |
| description | String | No | Todo description |
| status | String | No | "open" or "resolved" (default: "open") |
| priority | String | No | "low", "medium", or "high" (default: "medium") |
| due_date | DateTime | No | Due date (ISO format) |
| created_at | DateTime | No | Auto-generated timestamp |
| resolved_at | DateTime | No | When todo was resolved |

## Example Workflow

1. **Export current data:**
   ```bash
   python data_manager.py export
   ```

2. **Edit the CSV files** in your spreadsheet editor (Excel, Google Sheets, etc.)

3. **Add new records** or modify existing ones

4. **Validate the files:**
   ```bash
   python data_manager.py validate
   ```

5. **Import the updated data:**
   ```bash
   python data_manager.py import
   ```

## Validation Rules

The system validates:

### Cars
- Required fields: year, make, model
- Year must be between 1900 and current year + 1
- All other fields are optional

### Todos
- Required fields: car_id, title
- car_id must be a positive integer
- priority must be "low", "medium", or "high"
- status must be "open" or "resolved"
- car_id must reference an existing car

## Error Handling

- **Validation errors** are reported with specific row numbers
- **Import errors** trigger a database rollback
- **File not found errors** are clearly reported
- **Data type errors** are caught and reported

## Maintenance

This tool automatically adapts to database schema changes. When you modify:
- Database models (`models.py`)
- Pydantic schemas (`schemas.py`)

The export/import functionality will automatically include the new fields.

## Tips

1. **Backup your data** before running import operations
2. **Use validation** before importing to catch errors early
3. **Keep CSV files in version control** for reproducible test data
4. **Use the metadata file** to track export dates and record counts 