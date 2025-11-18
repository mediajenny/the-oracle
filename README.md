# Dashboard Transactions Line Item Performance Report Analyzer

A Streamlit application that analyzes Dashboard Transaction Events data to generate Line Item Performance Reports.

## Features

- **Multiple File Support**: Upload multiple transaction detail files that are automatically combined
- **Extract Line Item Data**: Parses JSON impression data to extract LINEITEMID values
- **Transaction Attribution**: Associates transactions with line items in their impression journey
- **Automatic Deduplication**: Removes duplicate transactions based on Transaction ID
- **Data Enrichment**: Joins with NXN lookup data for line item names and spend information
- **Performance Metrics**: Calculates Influenced ROAS (Not Deduplicated) for each line item
- **Interactive UI**: Filter, sort, and explore results with an intuitive Streamlit interface
- **Export Functionality**: Download results as Excel or CSV files

## Installation

This project uses Poetry for dependency management.

### Prerequisites

- Python 3.10 or higher
- Poetry ([installation instructions](https://python-poetry.org/docs/#installation))

### Setup

1. Clone or navigate to the project directory:
   ```bash
   cd excel-lineitem-analyzer
   ```

2. Install dependencies:
   ```bash
   poetry install
   ```

## Usage

### Running the Application

1. Start the Streamlit app:
   ```bash
   poetry run streamlit run src/app.py
   ```

2. Open your web browser to the URL shown in the terminal

3. Upload your files:
   - **Transaction Detail Files**: One or more files with DATA tabs
   - **NXN Lookup File**: One file with line item delivery lookup data

4. Click "Analyze Line Item Performance" to process the data

5. View results, apply filters, and export reports

### Required File Structure

#### Transaction Detail Files (one or more)
**Supported Formats:** Excel (.xlsx, .xls) or CSV (.csv)

**Excel files:**
- Must contain a **DATA** tab with these columns:
  - `Transaction ID`: Unique transaction identifier
  - `Transaction Total`: Transaction amount
  - `Impressions`: JSON array of impression objects containing LINEITEMID

**CSV files:**
- Must have headers in the first row
- Same required columns as Excel format

**Notes:**
- You can upload multiple transaction files
- Files are automatically combined
- Duplicate transactions (same Transaction ID) are removed

#### NXN Lookup File (one file)
**Supported Formats:** Excel (.xlsx, .xls) or CSV (.csv)

**Excel formats:**
1. **NXN LINE ITEM ID DELIVERY LOOKUP** sheet (standard format)
2. **Programmatic** sheet (Green Soul format)
3. Note: Excel files have headers on row 2

**CSV format:**
- Headers in first row

**Required columns (all formats):**
- `line_item_id`: Line item identifier (matches LINEITEMID from impressions)
- `line_item_name`: Friendly name for the line item
- `impressions`: Impression count
- `advertiser_invoice`: DSP spend amount

## How It Works

1. **Data Loading**: Loads multiple transaction files and combines them into a single dataset

2. **Deduplication**: Removes duplicate transactions based on Transaction ID (keeps first occurrence)

3. **Impression Parsing**: Extracts all unique LINEITEMID values from the JSON arrays in the Impressions column

4. **Transaction Attribution**: For each transaction, identifies all unique line items in its impression journey

5. **Aggregation**: Groups by LINEITEMID to calculate:
   - Unique transaction count
   - List of transaction IDs
   - Total transaction amount

6. **Enrichment**: Left joins with NXN lookup table to add:
   - Line item name
   - Impression count
   - DSP spend (advertiser_invoice)

7. **ROAS Calculation**: Computes Influenced ROAS = Total Transaction Amount / DSP Spend

8. **Flagging**: Identifies line items with no match in NXN lookup table

## Output Columns

| Column | Description |
|--------|-------------|
| LINEITEMID | Line item identifier from impression data |
| Unique Transaction Count | Number of unique transactions containing this line item |
| Transaction IDs | Comma-separated list of transaction IDs |
| Total Transaction Amount | Sum of transaction amounts for all transactions |
| NXN Line Item Name | Friendly name from NXN lookup table |
| NXN Impressions | Impression count from NXN lookup table |
| NXN Spend | Advertiser invoice (spend) from NXN lookup table |
| Influenced ROAS (Not Deduplicated) | Revenue / Spend ratio |
| Match Status | 'Matched' or 'No Match Found' |

## Project Structure

```
excel-lineitem-analyzer/
├── pyproject.toml           # Poetry configuration and dependencies
├── poetry.lock              # Locked dependency versions
├── README.md                # This file
└── src/
    ├── __init__.py          # Package initialization
    ├── app.py               # Streamlit application (main entry point)
    └── data_processor.py    # Core data processing logic
```

## Dependencies

- **streamlit**: Web application framework
- **pandas**: Data manipulation and analysis
- **openpyxl**: Excel file reading and writing

## Development

### Running Tests

(Tests to be implemented)

```bash
poetry run pytest
```

### Code Structure

- `src/app.py`: Streamlit UI and user interaction
- `src/data_processor.py`: Core business logic for data processing
  - `DataProcessor` class: Main processing engine
  - `load_excel_file()`: Excel file loading utility
  - `export_to_excel()`: Excel export utility

## Troubleshooting

### Common Issues

1. **"Sheet not found" error**:
   - Transaction files must have a tab named "DATA"
   - Lookup files should have either "NXN LINE ITEM ID DELIVERY LOOKUP" or "Programmatic" tab

2. **"Missing required columns" error**: Verify your lookup file contains: `line_item_id`, `line_item_name`, `impressions`, `advertiser_invoice`

3. **JSON parsing errors**: Check that the Impressions column contains valid JSON arrays

4. **Missing LINEITEMID**: Verify that impression objects in the Impressions column include a LINEITEMID field

5. **No matches in NXN lookup**: Check that line_item_id values in the lookup table match LINEITEMID values from impressions

## License

(To be determined)

## Version

1.0.0
