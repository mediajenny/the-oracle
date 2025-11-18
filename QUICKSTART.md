# Quick Start Guide

## 🚀 Getting Started

### 1. Launch the Application

**Option A: Using the run script (recommended)**
```bash
cd /Users/jennymorris/Projects/excel-lineitem-analyzer
./run.sh
```

**Option B: Using Poetry directly**
```bash
cd /Users/jennymorris/Projects/excel-lineitem-analyzer
poetry run streamlit run src/app.py
```

### 2. Open Your Browser

The app will automatically open in your default browser. Streamlit will choose an available port (e.g., 8501, 8502, 8503, etc.).

Check your terminal for the exact URL, which will look like:
```
Local URL: http://localhost:850X
```

Where X is the port number Streamlit assigned.

### 3. Upload Your Files

1. **Upload Transaction Detail Files** (left side):
   - Click "Browse files" in the Transaction Detail Files section
   - Select one or more files (Excel or CSV format)
   - Excel files: Must contain a **DATA** tab
   - CSV files: Must have headers in first row

2. **Upload NXN Lookup File** (right side):
   - Click "Browse files" in the NXN Lookup File section
   - Select your Line Item Lookup file (Excel or CSV format)
   - Excel: **NXN LINE ITEM ID DELIVERY LOOKU** or **Programmatic** sheet
   - CSV: Headers in first row

### 4. Analyze

1. Review the preview of your source data (shows combined transaction data)
2. Check the list of loaded files in the preview section
3. Click "🔄 Analyze Line Item Performance"
4. View the results with metrics and interactive tables
5. Apply filters and sorting as needed

### 5. Export

Download your results as:
- **Excel** (.xlsx) - Full formatted report
- **CSV** (.csv) - For use in other tools

## 📊 What This Tool Does

1. **Combines** multiple transaction detail files into a single dataset
2. **Deduplicates** transactions based on Transaction ID
3. **Extracts** LINEITEMID values from JSON impression data
4. **Associates** transactions with line items in their impression journey
5. **Aggregates** transaction counts and amounts by line item
6. **Enriches** data with line item names and spend from NXN lookup
7. **Calculates** Influenced ROAS (Not Deduplicated)

### Formula

```
Influenced ROAS = Total Transaction Amount / DSP Spend (advertiser_invoice)
```

## 📋 Output Columns

| Column | Description |
|--------|-------------|
| **LINEITEMID** | Line item identifier from impressions |
| **Unique Transaction Count** | Number of unique transactions |
| **Transaction IDs** | Comma-separated list of transaction IDs |
| **Total Transaction Amount** | Sum of all transaction amounts |
| **NXN Line Item Name** | Friendly name from lookup |
| **NXN Impressions** | Impression count from lookup |
| **NXN Spend** | Advertiser invoice (spend) |
| **Influenced ROAS** | Revenue / Spend ratio |
| **Match Status** | Matched or No Match Found |

## ⚙️ Key Features

- **Multiple File Support**: Upload and combine multiple transaction files
- **Automatic Deduplication**: Removes duplicate transactions across files
- **Per-Line Item Counting**: Each transaction counted once per unique LINEITEMID
- **Match Flagging**: Identifies line items without NXN lookup matches
- **Interactive Filters**: Filter by match status and search terms
- **Flexible Sorting**: Sort by any metric (revenue, ROAS, spend, etc.)
- **Summary Metrics**: View totals and overall ROAS at a glance

## 🐛 Troubleshooting

### Issue: "Sheet not found" error
**Solution**: Verify your Excel file has the exact tab names (case-sensitive)

### Issue: No data processed
**Solution**: Check that the Impressions column contains valid JSON arrays

### Issue: All items show "No Match Found"
**Solution**: Verify that line_item_id values in NXN lookup match LINEITEMID values from impressions

## 💡 Tips

- **Upload multiple files**: Analyze data across different time periods or sources
- **Check file list**: Review which files were loaded in the preview section
- **Watch for duplicates**: The tool automatically removes transactions with duplicate IDs
- **Use search filter**: Quickly find specific line items
- **Sort by ROAS**: See top performers by sorting "Influenced ROAS" descending
- **Check unmatched items**: Review the "No Match Found" section for missing lookup data
- **Export to Excel**: Maintain all formatting for reporting purposes

## 📧 Support

For issues or questions, refer to the main README.md file.

## ✅ Test Results

Successfully tested with:
- **3,426** transactions
- **12** unique line items
- **11** matched with NXN lookup
- **1** flagged as "No Match Found" (LiquidM_Main)
- Overall ROAS: **150.76**
