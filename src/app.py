"""
Streamlit application for Dashboard Transactions Line Item Performance Report.
"""

import streamlit as st
import pandas as pd
import io
from data_processor import (
    DataProcessor,
    load_multiple_transaction_files,
    load_nxn_lookup_file,
)


def line_item_performance_report():
    """Line Item Performance Report tab."""
    st.title("📊 Dashboard Transactions Line Item Performance Report")
    st.markdown("""
    This tool analyzes transaction data to show line item performance by:
    - Extracting LINEITEMID values from impression journeys
    - Aggregating transaction counts and amounts by line item
    - Enriching with NXN lookup data (line item names, spend, impressions)
    - Calculating Influenced ROAS (Not Deduplicated)
    """)

    # File upload
    st.header("1. Upload Files")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Transaction Detail Files")
        transaction_files = st.file_uploader(
            "Upload one or more Dashboard Transaction Events files",
            type=["xlsx", "xls", "csv"],
            accept_multiple_files=True,
            help="Supports Excel (.xlsx, .xls) or CSV (.csv) files with transaction and impression data",
            key="transaction_files",
        )

    with col2:
        st.subheader("NXN Lookup File")
        nxn_file = st.file_uploader(
            "Upload Line Item Lookup file",
            type=["xlsx", "xls", "csv"],
            help="Supports Excel (.xlsx, .xls) or CSV (.csv) with line item lookup data",
            key="nxn_file",
        )

    if transaction_files and nxn_file:
        try:
            # Load data
            with st.spinner("Loading files..."):
                data_df = load_multiple_transaction_files(transaction_files)
                nxn_lookup_df = load_nxn_lookup_file(nxn_file)

            st.success(
                f"✓ Loaded {len(transaction_files)} transaction file(s) with {len(data_df):,} total transactions"
            )
            st.success(f"✓ Loaded {len(nxn_lookup_df)} NXN line items from lookup file")

            # Display data preview
            with st.expander("📋 Preview Source Data"):
                st.subheader("Combined Transaction Data (First 10 rows)")
                st.dataframe(data_df.head(10), use_container_width=True)

                st.subheader("NXN LINE ITEM ID DELIVERY LOOKUP (First 10 rows)")
                st.markdown(
                    "*Showing all columns - scroll horizontally to view full data*"
                )
                # Configure column settings to show full content
                st.dataframe(
                    nxn_lookup_df.head(10),
                    use_container_width=True,
                    column_config={
                        "line_item_id": st.column_config.NumberColumn(
                            "Line Item ID",
                            help="Full line item identifier",
                            format="%d",
                        ),
                        "line_item_name": st.column_config.TextColumn(
                            "Line Item Name", help="Full line item name", width="large"
                        ),
                        "impressions": st.column_config.NumberColumn(
                            "Impressions", format="%d"
                        ),
                        "advertiser_invoice": st.column_config.NumberColumn(
                            "Spend", format="$%.2f"
                        ),
                    },
                )

                # Show file details
                st.subheader("📄 Loaded Files")
                st.write("**Transaction Files:**")
                for i, file in enumerate(transaction_files, 1):
                    st.write(f"{i}. {file.name}")
                st.write(f"**NXN Lookup File:** {nxn_file.name}")

            # Process data
            st.header("2. Process Data")
            if st.button("🔄 Analyze Line Item Performance", type="primary"):
                with st.spinner("Processing transaction data..."):
                    processor = DataProcessor(data_df, nxn_lookup_df)
                    results_df = processor.process_transactions()

                    if results_df.empty:
                        st.error(
                            "No line item data found in transactions. Please check your data."
                        )
                        return

                    # Store results in session state
                    st.session_state["results_df"] = results_df
                    st.session_state["processor"] = processor

                st.success("✓ Analysis complete!")

            # Display results
            if "results_df" in st.session_state:
                results_df = st.session_state["results_df"]
                processor = st.session_state["processor"]

                st.header("3. Results")

                # Summary metrics
                summary = processor.get_summary_stats()
                col1, col2, col3, col4 = st.columns(4)

                with col1:
                    st.metric("Total Line Items", f"{summary['total_lineitems']:,}")
                    st.caption(f"✓ Matched: {summary['matched_lineitems']}")
                    st.caption(f"⚠ Unmatched: {summary['unmatched_lineitems']}")

                with col2:
                    st.metric(
                        "Unique Transactions", f"{summary['total_transactions']:,}"
                    )

                with col3:
                    st.metric("Total Revenue", f"${summary['total_revenue']:,.2f}")

                with col4:
                    total_spend = (
                        summary["total_spend"]
                        if pd.notna(summary["total_spend"])
                        else 0
                    )
                    st.metric("Total Spend", f"${total_spend:,.2f}")
                    if summary["overall_roas"]:
                        st.caption(f"Overall ROAS: {summary['overall_roas']:.2f}")

                # Filters
                st.subheader("Filter Results")
                col1, col2 = st.columns(2)

                with col1:
                    # Get unique insertion order names (handle NaN values)
                    if "Insertion Order Name" in results_df.columns:
                        unique_insertion_orders = sorted(
                            [
                                x
                                for x in results_df["Insertion Order Name"].unique()
                                if pd.notna(x)
                            ]
                        )
                        insertion_order_filter = st.multiselect(
                            "Insertion Order Name",
                            options=unique_insertion_orders,
                            default=unique_insertion_orders,
                        )
                    else:
                        insertion_order_filter = None

                with col2:
                    search_term = st.text_input(
                        "Search LINEITEMID or Name", placeholder="Enter search term..."
                    )

                # Apply filters
                filtered_df = results_df.copy()

                if (
                    insertion_order_filter
                    and "Insertion Order Name" in filtered_df.columns
                ):
                    filtered_df = filtered_df[
                        filtered_df["Insertion Order Name"].isin(insertion_order_filter)
                    ]

                if search_term:
                    filtered_df = filtered_df[
                        filtered_df["LINEITEMID"].str.contains(
                            search_term, case=False, na=False
                        )
                        | filtered_df["NXN Line Item Name"].str.contains(
                            search_term, case=False, na=False
                        )
                    ]

                # Sort options
                sort_col = st.selectbox(
                    "Sort by",
                    options=[
                        "Unique Transaction Count",
                        "Total Transaction Amount",
                        "NXN Spend",
                        "Influenced ROAS (Not Deduplicated)",
                        "LINEITEMID",
                    ],
                    index=1,
                )

                sort_order = st.radio(
                    "Order", options=["Descending", "Ascending"], horizontal=True
                )
                ascending = sort_order == "Ascending"

                # Sort data
                if sort_col in filtered_df.columns:
                    filtered_df = filtered_df.sort_values(
                        by=sort_col, ascending=ascending, na_position="last"
                    )

                # Display results table
                st.subheader(f"Line Item Performance ({len(filtered_df)} records)")
                st.markdown(
                    """
                    <div style="background-color: #e3f2fd; padding: 12px; border-radius: 5px; margin: 10px 0;">
                        <p style="color: #1976d2; font-size: 16px; margin: 0;">
                            💡 <strong>Pro Tip:</strong> Spot check 2-3 transactions and determine if the Line Item ID is indeed showing in the Impression journey in the Transactions file.
                        </p>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

                st.markdown(
                    """
                    <div style="background-color: #e3f2fd; padding: 12px; border-radius: 5px; margin: 10px 0;">
                        <p style="color: #1976d2; font-size: 16px; margin: 0;">
                            💡 Use summary metrics internally only, do not report these to the client since these are showing total duplicated revenue and transaction impact. These are not deduplicated transactions.
                        </p>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

                # Calculate totals before formatting (need numeric values)
                total_row_data = {}
                numeric_columns = {
                    "Unique Transaction Count": "sum",
                    "Total Transaction Amount": "sum",
                    "NXN Impressions": "sum",
                    "NXN Spend": "sum",
                }

                # Calculate totals for numeric columns
                for col, agg_func in numeric_columns.items():
                    if col in filtered_df.columns:
                        if agg_func == "sum":
                            total_row_data[col] = filtered_df[col].sum()

                # Calculate overall ROAS for the filtered data
                if (
                    "Total Transaction Amount" in total_row_data
                    and "NXN Spend" in total_row_data
                ):
                    if total_row_data["NXN Spend"] > 0:
                        total_row_data["Influenced ROAS (Not Deduplicated)"] = (
                            total_row_data["Total Transaction Amount"]
                            / total_row_data["NXN Spend"]
                        )

                # Rearrange columns in desired order (hide Match Status)
                desired_column_order = [
                    "Advertiser Name",
                    "Insertion Order ID",
                    "Insertion Order Name",
                    "Package ID",
                    "Package Name",
                    "LINEITEMID",
                    "NXN Line Item Name",
                    "Unique Transaction Count",
                    "Total Transaction Amount",
                    "NXN Impressions",
                    "NXN Spend",
                    "Influenced ROAS (Not Deduplicated)",
                    "Transaction IDs",
                ]

                # Filter to only include columns that exist in the dataframe
                columns_to_display = [
                    col for col in desired_column_order if col in filtered_df.columns
                ]

                # Reorder the dataframe
                display_df = filtered_df[columns_to_display].copy()

                # Format numbers
                if "Total Transaction Amount" in display_df.columns:
                    display_df["Total Transaction Amount"] = display_df[
                        "Total Transaction Amount"
                    ].apply(lambda x: f"${x:,.2f}" if pd.notna(x) else "")

                if "NXN Spend" in display_df.columns:
                    display_df["NXN Spend"] = display_df["NXN Spend"].apply(
                        lambda x: f"${x:,.2f}" if pd.notna(x) else ""
                    )

                if "NXN Impressions" in display_df.columns:
                    display_df["NXN Impressions"] = display_df["NXN Impressions"].apply(
                        lambda x: f"{x:,.0f}" if pd.notna(x) else ""
                    )

                if "Influenced ROAS (Not Deduplicated)" in display_df.columns:
                    display_df["Influenced ROAS (Not Deduplicated)"] = display_df[
                        "Influenced ROAS (Not Deduplicated)"
                    ].apply(lambda x: f"{x:.2f}" if pd.notna(x) else "")

                # Display total row first (pinned at top)
                st.markdown("### Totals")
                total_cols = st.columns(6)
                with total_cols[0]:
                    st.metric("Total Line Items", len(filtered_df))
                with total_cols[1]:
                    if "Unique Transaction Count" in total_row_data:
                        st.metric(
                            "Total Transactions",
                            f"{int(total_row_data['Unique Transaction Count']):,}",
                        )
                with total_cols[2]:
                    if "Total Transaction Amount" in total_row_data:
                        st.metric(
                            "Total Revenue",
                            f"${total_row_data['Total Transaction Amount']:,.2f}",
                        )
                with total_cols[3]:
                    if "NXN Impressions" in total_row_data:
                        st.metric(
                            "Total Impressions",
                            f"{total_row_data['NXN Impressions']:,.0f}",
                        )
                with total_cols[4]:
                    if "NXN Spend" in total_row_data:
                        st.metric("Total Spend", f"${total_row_data['NXN Spend']:,.2f}")
                with total_cols[5]:
                    if "Influenced ROAS (Not Deduplicated)" in total_row_data:
                        st.metric(
                            "Overall ROAS",
                            f"{total_row_data['Influenced ROAS (Not Deduplicated)']:.2f}",
                        )

                st.markdown("---")

                # Display table without total row (since it's shown above)
                st.dataframe(display_df, use_container_width=True, height=600)

                # QA Section - NXN Line Items with No Transactions
                st.subheader("NXN Line Items Not Matched to Transactions")
                if (
                    processor.unmatched_nxn_df is not None
                    and not processor.unmatched_nxn_df.empty
                ):
                    # Calculate total from original data BEFORE formatting
                    if "NXN Spend" in processor.unmatched_nxn_df.columns:
                        total_unmatched_spend_value = processor.unmatched_nxn_df[
                            "NXN Spend"
                        ].sum()
                    else:
                        total_unmatched_spend_value = 0

                    st.info(
                        f"⚠ {len(processor.unmatched_nxn_df)} line items in NXN file have no matching transactions. Total spend: ${total_unmatched_spend_value:,.2f}"
                    )

                    # Now format for display
                    unmatched_nxn_display = processor.unmatched_nxn_df.copy()

                    # Format numeric columns
                    if "NXN Spend" in unmatched_nxn_display.columns:
                        unmatched_nxn_display["NXN Spend"] = unmatched_nxn_display[
                            "NXN Spend"
                        ].apply(lambda x: f"${x:,.2f}" if pd.notna(x) else "")
                    if "NXN Impressions" in unmatched_nxn_display.columns:
                        unmatched_nxn_display["NXN Impressions"] = (
                            unmatched_nxn_display["NXN Impressions"].apply(
                                lambda x: f"{x:,.0f}" if pd.notna(x) else ""
                            )
                        )

                    # Define column order matching Line Item Performance
                    desired_column_order = [
                        "Advertiser Name",
                        "Insertion Order ID",
                        "Insertion Order Name",
                        "Package ID",
                        "Package Name",
                        "LINEITEMID",
                        "NXN Line Item Name",
                        "NXN Impressions",
                        "NXN Spend",
                    ]

                    # Filter to only include columns that exist
                    display_cols = [
                        col
                        for col in desired_column_order
                        if col in unmatched_nxn_display.columns
                    ]

                    # Create column config to force left alignment
                    column_config = {}
                    for col in display_cols:
                        column_config[col] = st.column_config.TextColumn(
                            col, help=None, width="medium"
                        )

                    st.dataframe(
                        unmatched_nxn_display[display_cols],
                        use_container_width=True,
                        height=300,
                        column_config=column_config,
                    )
                else:
                    st.success("✓ All NXN line items have matching transactions")

                # QA Tools Section - Unified spend analysis and source file breakdown
                st.header("QA Tools")
                st.markdown(
                    """
                    <div style="background-color: #e3f2fd; padding: 12px; border-radius: 5px; margin: 5px 0 5px 0;">
                        <p style="color: #1976d2; font-size: 16px; margin: 0;">
                            💡 QA totals listed here with Transaction Reports and NXN Report to confirm if they match. This is a quick check to determine if the data is ingested correctly.
                        </p>
                    </div>
                """,
                    unsafe_allow_html=True,
                )

                # Add custom styling for the QA container and table styling
                st.markdown(
                    """
                    <style>
                    .qa-container {
                        background-color: white;
                        padding: 20px;
                        margin: 10px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    table th {
                        background-color: #f0f2f6;
                        padding: 10px;
                        text-align: left !important;
                        border-bottom: 2px solid #ddd;
                    }
                    table td {
                        padding: 10px;
                        border-bottom: 1px solid #ddd;
                        text-align: left !important;
                    }
                    table tr:last-child td {
                        background-color: #e0e0e0;
                        font-weight: bold;
                        border-top: 2px solid #999;
                        text-align: left !important;
                    }
                    /* Ensure all table content is left-aligned */
                    .dataframe td, .dataframe th {
                        text-align: left !important;
                    }
                    </style>
                """,
                    unsafe_allow_html=True,
                )

                # Use container with custom styling
                st.markdown('<div class="qa-container">', unsafe_allow_html=True)

                # Spend Comparison Metrics
                st.markdown("#### Spend Analysis")
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric(
                        "Total NXN Spend (All Line Items)",
                        f"${summary['total_nxn_spend']:,.2f}",
                    )
                with col2:
                    matched_spend = (
                        summary["total_spend"]
                        if pd.notna(summary["total_spend"])
                        else 0
                    )
                    st.metric("Matched Line Items Spend", f"${matched_spend:,.2f}")
                with col3:
                    spend_gap = summary["total_nxn_spend"] - matched_spend
                    st.metric(
                        "Unmatched Spend Gap",
                        f"${spend_gap:,.2f}",
                        delta_color="inverse",
                    )

                st.markdown(
                    """
                    <p style="font-size: 14px; color: #666; margin-top: 10px;">
                        <strong>Note:</strong> Total NXN Spend includes all line items in the lookup file. Matched Line Items Spend only includes line items that appear in transaction impressions.
                    </p>
                """,
                    unsafe_allow_html=True,
                )

                st.markdown("---")

                # Revenue by Source File
                st.markdown("#### Total Transaction Amount by Source File")
                revenue_by_file = processor.get_revenue_by_source_file()
                if not revenue_by_file.empty:
                    # Calculate total before formatting
                    total_revenue = revenue_by_file["Total Transaction Amount"].sum()

                    # Format the display values
                    revenue_display = revenue_by_file.copy()
                    revenue_display["Total Transaction Amount (Formatted)"] = (
                        revenue_display["Total Transaction Amount"].apply(
                            lambda x: f"${x:,.2f}" if pd.notna(x) else ""
                        )
                    )

                    # Add total row
                    total_row = pd.DataFrame(
                        {
                            "Source File Name": ["<b>TOTAL</b>"],
                            "Total Transaction Amount (Formatted)": [
                                f"<b>${total_revenue:,.2f}</b>"
                            ],
                        }
                    )
                    revenue_display = pd.concat(
                        [
                            revenue_display[
                                [
                                    "Source File Name",
                                    "Total Transaction Amount (Formatted)",
                                ]
                            ],
                            total_row,
                        ],
                        ignore_index=True,
                    )

                    # Style the dataframe with HTML for bold total row with explicit alignment
                    html_table = revenue_display.to_html(escape=False, index=False)
                    # Ensure all cells have left alignment
                    html_table = html_table.replace(
                        "<th>", '<th style="text-align: left;">'
                    )
                    html_table = html_table.replace(
                        "<td>", '<td style="text-align: left;">'
                    )
                    st.markdown(html_table, unsafe_allow_html=True)
                else:
                    st.info("Source file tracking not available")

                st.markdown("</div>", unsafe_allow_html=True)

                # Export functionality
                st.header("4. Export Results")

                col1, col2 = st.columns(2)

                with col1:
                    # Export to Excel
                    output = io.BytesIO()
                    with pd.ExcelWriter(output, engine="openpyxl") as writer:
                        results_df.to_excel(
                            writer, sheet_name="Line Item Performance", index=False
                        )
                    output.seek(0)

                    st.download_button(
                        label="📥 Download Excel Report",
                        data=output,
                        file_name="line_item_performance_report.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )

                with col2:
                    # Export to CSV
                    csv = results_df.to_csv(index=False)
                    st.download_button(
                        label="📥 Download CSV Report",
                        data=csv,
                        file_name="line_item_performance_report.csv",
                        mime="text/csv",
                    )

                # Warnings for unmatched items
                if summary["unmatched_lineitems"] > 0:
                    st.warning(
                        f"⚠ {summary['unmatched_lineitems']} line item(s) were not found in the NXN lookup table. "
                        "These items have been flagged with 'No Match Found' status."
                    )

                    with st.expander("View Unmatched Line Items"):
                        unmatched = results_df[
                            results_df["Match Status"] == "No Match Found"
                        ][
                            [
                                "LINEITEMID",
                                "Unique Transaction Count",
                                "Total Transaction Amount",
                            ]
                        ]
                        st.dataframe(unmatched, use_container_width=True)

        except Exception as e:
            st.error(f"Error processing file: {str(e)}")
            st.exception(e)

    else:
        st.info(
            "👆 Please upload transaction file(s) and NXN lookup file to get started"
        )

        # Instructions
        with st.expander("📖 Instructions"):
            st.markdown("""
            ### Required Files

            **Transaction Detail Files (one or more)**
            - Supports: **Excel** (.xlsx, .xls) or **CSV** (.csv) files
            - Excel files: Must contain a **DATA** tab
            - CSV files: Must have column headers in the first row
            - Required columns:
              - `Transaction ID`: Unique transaction identifier
              - `Transaction Total`: Transaction amount
              - `Impressions`: JSON array of impression objects containing LINEITEMID
            - You can upload multiple files - they will be automatically combined
            - Duplicate transactions (same Transaction ID) will be removed

            **NXN Lookup File (one file)**
            - Supports: **Excel** (.xlsx, .xls) or **CSV** (.csv) files
            - Excel formats:
              1. **NXN LINE ITEM ID DELIVERY LOOKUP** sheet
              2. **Programmatic** sheet (Green Soul format)
              3. Note: Excel files have headers on row 2
            - CSV format: Headers in first row
            - Required columns:
              - `line_item_id`: Line item identifier (matches LINEITEMID from impressions)
              - `line_item_name`: Friendly name for the line item
              - `impressions`: Impression count
              - `advertiser_invoice`: DSP spend amount

            ### How It Works

            1. Loads and combines all transaction files into a single dataset
            2. Removes duplicate transactions based on Transaction ID
            3. Parses the JSON data in the Impressions column
            4. Extracts all unique LINEITEMID values from each transaction's impression journey
            5. Counts each transaction once per unique LINEITEMID it contains
            6. Aggregates transaction counts and amounts by LINEITEMID
            7. Joins with NXN lookup data to add names, spend, and other metrics
            8. Calculates Influenced ROAS = Total Transaction Amount / DSP Spend

            ### Output Columns

            - **LINEITEMID**: Line item identifier from impressions
            - **Unique Transaction Count**: Number of unique transactions containing this line item
            - **Transaction IDs**: Comma-separated list of transaction IDs
            - **Total Transaction Amount**: Sum of transaction amounts
            - **NXN Line Item Name**: Friendly name from lookup table
            - **NXN Impressions**: Impression count from lookup table
            - **NXN Spend**: Advertiser invoice amount from lookup table
            - **Influenced ROAS (Not Deduplicated)**: Revenue / Spend ratio
            - **Match Status**: Whether the line item was found in NXN lookup

            ### Tips

            - Upload multiple transaction files to analyze data across different time periods or sources
            - Transactions with duplicate IDs will automatically be deduplicated (first occurrence kept)
            - Use the search and filter options to explore your results
            """)


def creative_report():
    """Dashboard Transactions Creative Report tab."""
    st.title("🎨 Dashboard Transactions Creative Report")
    st.markdown("""
    This tool analyzes transaction data to show creative performance by:
    - Extracting creative IDs from impression journeys
    - Aggregating transaction counts and amounts by creative
    - Providing insights into which creatives drive the most conversions
    """)

    st.info("🚧 Creative Report functionality coming soon!")

    # Placeholder for future implementation
    st.markdown("""
    ### Planned Features:
    - Upload transaction files with creative impression data
    - Extract and aggregate creative performance metrics
    - View transaction counts and revenue by creative
    - Export creative performance reports
    """)


def main():
    """Main Streamlit application with tabbed navigation."""
    st.set_page_config(
        page_title="Dashboard Transaction Analyzer", page_icon="📊", layout="wide"
    )

    # Create top navigation tabs
    tab1, tab2 = st.tabs(["📊 Line Item Performance Report", "🎨 Creative Report"])

    with tab1:
        line_item_performance_report()

    with tab2:
        creative_report()


if __name__ == "__main__":
    main()
