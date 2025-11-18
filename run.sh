#!/bin/bash
# Launch script for the Dashboard Transactions Line Item Performance Report Analyzer

echo "Starting Dashboard Transactions Line Item Performance Report Analyzer..."
echo ""

# Navigate to the script directory
cd "$(dirname "$0")"

# Run the Streamlit app
poetry run streamlit run src/app.py
