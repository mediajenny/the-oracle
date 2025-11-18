"""
Core data processing logic for Dashboard Transactions Line Item Performance Report.
"""

import json
import pandas as pd
from typing import Dict, List


class DataProcessor:
    """Processes transaction data and extracts line item performance metrics."""

    def __init__(self, data_df: pd.DataFrame, nxn_lookup_df: pd.DataFrame):
        """
        Initialize the data processor.

        Args:
            data_df: DataFrame from the DATA tab containing transaction data
            nxn_lookup_df: DataFrame from NXN LINE ITEM ID DELIVERY LOOKUP tab
        """
        self.data_df = data_df
        self.nxn_lookup_df = nxn_lookup_df
        self.results_df = None
        self.unmatched_nxn_df = None

    def extract_lineitem_ids(self, impressions_str: str) -> List[str]:
        """
        Extract unique LINEITEMID values from an Impressions JSON string.

        Args:
            impressions_str: JSON string containing array of impression objects

        Returns:
            List of unique LINEITEMID values
        """
        try:
            if pd.isna(impressions_str) or impressions_str == "":
                return []

            # Parse JSON array
            impressions = json.loads(impressions_str)

            # Extract unique LINEITEMIDs
            lineitem_ids = []
            for impression in impressions:
                if isinstance(impression, dict) and "LINEITEMID" in impression:
                    lineitem_id = impression["LINEITEMID"]
                    if lineitem_id and lineitem_id not in lineitem_ids:
                        lineitem_ids.append(lineitem_id)

            return lineitem_ids

        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing impressions: {e}")
            return []

    def process_transactions(self) -> pd.DataFrame:
        """
        Process transaction data to create line item performance report.

        Returns:
            DataFrame with aggregated metrics by LINEITEMID
        """
        # Create a list to store expanded transaction-lineitem pairs
        transaction_lineitem_pairs = []

        # Iterate through each transaction
        for idx, row in self.data_df.iterrows():
            transaction_id = row["Transaction ID"]
            transaction_total = row["Transaction Total"]
            impressions = row["Impressions"]

            # Extract unique LINEITEMIDs for this transaction
            lineitem_ids = self.extract_lineitem_ids(impressions)

            # Create a record for each unique LINEITEMID in this transaction
            for lineitem_id in lineitem_ids:
                transaction_lineitem_pairs.append(
                    {
                        "LINEITEMID": lineitem_id,
                        "Transaction ID": transaction_id,
                        "Transaction Total": transaction_total,
                    }
                )

        # Convert to DataFrame
        pairs_df = pd.DataFrame(transaction_lineitem_pairs)

        if pairs_df.empty:
            return pd.DataFrame()

        # Group by LINEITEMID and aggregate
        aggregated = (
            pairs_df.groupby("LINEITEMID")
            .agg(
                {
                    "Transaction ID": [
                        "count",
                        lambda x: ", ".join(sorted(set(map(str, x)))),
                    ],
                    "Transaction Total": "sum",
                }
            )
            .reset_index()
        )

        # Flatten column names
        aggregated.columns = [
            "LINEITEMID",
            "Unique Transaction Count",
            "Transaction IDs",
            "Total Transaction Amount",
        ]

        # Join with NXN lookup data
        enriched_df = self._enrich_with_nxn_data(aggregated)

        # Calculate Influenced ROAS
        enriched_df = self._calculate_roas(enriched_df)

        # Identify NXN line items that have no matching transactions
        self._identify_unmatched_nxn_items(aggregated)

        self.results_df = enriched_df
        return enriched_df

    def _enrich_with_nxn_data(self, aggregated_df: pd.DataFrame) -> pd.DataFrame:
        """
        Enrich aggregated data with NXN lookup information.

        Args:
            aggregated_df: DataFrame with aggregated transaction metrics

        Returns:
            Enriched DataFrame with NXN data
        """
        # Prepare NXN lookup with relevant columns (including new ones)
        desired_columns = {
            "line_item_id": "LINEITEMID",
            "advertiser_name": "Advertiser Name",
            "insertion_order_id": "Insertion Order ID",
            "insertion_order_name": "Insertion Order Name",
            "packag_id": "Package ID",  # Note: might be 'packag_id' or 'package_id'
            "package_name": "Package Name",
            "line_item_name": "NXN Line Item Name",
            "impressions": "NXN Impressions",
            "advertiser_invoice": "NXN Spend",
        }

        # Build list of available columns (handle both 'packag_id' and 'package_id')
        available_columns = []
        for col_key, col_name in desired_columns.items():
            if col_key in self.nxn_lookup_df.columns:
                available_columns.append((col_key, col_name))
            elif col_key == "packag_id" and "package_id" in self.nxn_lookup_df.columns:
                available_columns.append(("package_id", col_name))

        # Select available columns from NXN lookup
        nxn_subset = self.nxn_lookup_df[[col[0] for col in available_columns]].copy()
        nxn_subset.columns = [col[1] for col in available_columns]

        # Deduplicate NXN data by LINEITEMID (aggregate duplicate rows)
        # Some NXN files have multiple rows per line_item_id (e.g., different beacon names)
        agg_dict = {}
        for col in nxn_subset.columns:
            if col == "LINEITEMID":
                continue
            elif col in ["NXN Impressions", "NXN Spend"]:
                agg_dict[col] = "sum"  # Sum numeric metrics
            else:
                agg_dict[col] = "first"  # Take first value for names/IDs

        # Group by LINEITEMID to remove duplicates
        nxn_subset_dedup = nxn_subset.groupby("LINEITEMID", as_index=False).agg(
            agg_dict
        )

        # Convert LINEITEMID to string for matching (NXN has integers, impressions has strings)
        # Use .apply() with int() first to ensure full precision, then convert to string
        # This prevents scientific notation for large integers
        if pd.api.types.is_numeric_dtype(nxn_subset_dedup["LINEITEMID"]):
            nxn_subset_dedup["LINEITEMID"] = nxn_subset_dedup["LINEITEMID"].apply(
                lambda x: str(int(x)) if pd.notna(x) else x
            )
        else:
            nxn_subset_dedup["LINEITEMID"] = nxn_subset_dedup["LINEITEMID"].astype(str)

        aggregated_df_copy = aggregated_df.copy()
        aggregated_df_copy["LINEITEMID"] = aggregated_df_copy["LINEITEMID"].astype(str)

        # Left join to keep all LINEITEMIDs from transaction data
        enriched = aggregated_df_copy.merge(
            nxn_subset_dedup, on="LINEITEMID", how="left"
        )

        # Flag records with no match
        enriched["Match Status"] = enriched["NXN Line Item Name"].apply(
            lambda x: "Matched" if pd.notna(x) else "No Match Found"
        )

        return enriched

    def _calculate_roas(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate Influenced ROAS (Not Deduplicated) for each line item.

        Formula: Total Transaction Amount / NXN Spend

        Args:
            df: DataFrame with transaction amounts and NXN spend

        Returns:
            DataFrame with ROAS column added
        """
        df = df.copy()

        # Calculate ROAS, handling division by zero and missing values
        df["Influenced ROAS (Not Deduplicated)"] = df.apply(
            lambda row: (
                row["Total Transaction Amount"] / row["NXN Spend"]
                if pd.notna(row["NXN Spend"]) and row["NXN Spend"] > 0
                else None
            ),
            axis=1,
        )

        return df

    def _identify_unmatched_nxn_items(self, aggregated_df: pd.DataFrame):
        """
        Identify NXN line items that have no matching transactions.

        Args:
            aggregated_df: DataFrame with aggregated transaction metrics by LINEITEMID
        """
        # Get all LINEITEMIDs that appear in transactions
        matched_lineitem_ids = set(aggregated_df["LINEITEMID"].astype(str))

        # Get all line_item_ids from NXN lookup
        nxn_lineitem_ids = (
            self.nxn_lookup_df["line_item_id"]
            .apply(lambda x: str(int(x)) if pd.notna(x) else str(x))
            .unique()
        )

        # Find NXN line items that don't appear in transactions
        unmatched_ids = [
            lid for lid in nxn_lineitem_ids if lid not in matched_lineitem_ids
        ]

        # Create DataFrame for unmatched NXN items
        if unmatched_ids:
            # Filter NXN lookup for unmatched items
            unmatched_mask = (
                self.nxn_lookup_df["line_item_id"]
                .apply(lambda x: str(int(x)) if pd.notna(x) else str(x))
                .isin(unmatched_ids)
            )

            # Select relevant columns - matching Line Item Performance structure
            columns_to_include = {
                "advertiser_name": "Advertiser Name",
                "insertion_order_id": "Insertion Order ID",
                "insertion_order_name": "Insertion Order Name",
                "packag_id": "Package ID",
                "package_name": "Package Name",
                "line_item_id": "LINEITEMID",
                "line_item_name": "NXN Line Item Name",
                "impressions": "NXN Impressions",
                "advertiser_invoice": "NXN Spend",
            }

            # Build list of available columns (handle both 'packag_id' and 'package_id')
            available_cols_list = []
            available_cols_mapping = {}
            for col_key, col_name in columns_to_include.items():
                if col_key in self.nxn_lookup_df.columns:
                    available_cols_list.append(col_key)
                    available_cols_mapping[col_key] = col_name
                elif (
                    col_key == "packag_id"
                    and "package_id" in self.nxn_lookup_df.columns
                ):
                    available_cols_list.append("package_id")
                    available_cols_mapping["package_id"] = col_name

            unmatched_nxn = self.nxn_lookup_df[unmatched_mask][
                available_cols_list
            ].copy()
            unmatched_nxn.columns = [
                available_cols_mapping[col] for col in available_cols_list
            ]

            # Convert LINEITEMID to string for consistency
            unmatched_nxn["LINEITEMID"] = unmatched_nxn["LINEITEMID"].apply(
                lambda x: str(int(x)) if pd.notna(x) else str(x)
            )

            # Group by LINEITEMID to handle duplicates (sum spend and impressions)
            agg_dict = {}
            for col in unmatched_nxn.columns:
                if col == "LINEITEMID":
                    continue
                elif col in ["NXN Impressions", "NXN Spend"]:
                    agg_dict[col] = "sum"
                else:
                    agg_dict[col] = "first"

            self.unmatched_nxn_df = unmatched_nxn.groupby(
                "LINEITEMID", as_index=False
            ).agg(agg_dict)
        else:
            self.unmatched_nxn_df = pd.DataFrame()

    def get_summary_stats(self) -> Dict:
        """
        Get summary statistics about the processed data.

        Returns:
            Dictionary containing summary metrics
        """
        if self.results_df is None:
            return {}

        # Calculate total NXN spend from lookup file (all line items)
        total_nxn_spend = 0
        if "advertiser_invoice" in self.nxn_lookup_df.columns:
            # Group by line_item_id and sum to handle duplicates
            nxn_grouped = self.nxn_lookup_df.groupby("line_item_id")[
                "advertiser_invoice"
            ].sum()
            total_nxn_spend = nxn_grouped.sum()

        return {
            "total_lineitems": len(self.results_df),
            "matched_lineitems": len(
                self.results_df[self.results_df["Match Status"] == "Matched"]
            ),
            "unmatched_lineitems": len(
                self.results_df[self.results_df["Match Status"] == "No Match Found"]
            ),
            "total_transactions": self.results_df["Unique Transaction Count"].sum(),
            "total_revenue": self.results_df["Total Transaction Amount"].sum(),
            "total_spend": self.results_df[
                "NXN Spend"
            ].sum(),  # Spend for matched line items only
            "total_nxn_spend": total_nxn_spend,  # Total spend from entire NXN file
            "overall_roas": (
                self.results_df["Total Transaction Amount"].sum()
                / self.results_df["NXN Spend"].sum()
                if self.results_df["NXN Spend"].sum() > 0
                else None
            ),
        }

    def get_revenue_by_source_file(self) -> pd.DataFrame:
        """
        Get total transaction amount grouped by source file name.

        Returns:
            DataFrame with source file names and their total transaction amounts
        """
        if "Source File Name" not in self.data_df.columns:
            return pd.DataFrame()

        revenue_by_file = (
            self.data_df.groupby("Source File Name")["Transaction Total"]
            .sum()
            .reset_index()
        )
        revenue_by_file.columns = ["Source File Name", "Total Transaction Amount"]
        revenue_by_file = revenue_by_file.sort_values(
            "Total Transaction Amount", ascending=False
        )

        return revenue_by_file


def load_transaction_file(file) -> pd.DataFrame:
    """
    Load transaction data from a single Excel or CSV file.

    Args:
        file: File object from Streamlit file uploader

    Returns:
        DataFrame with transaction data (includes 'Source File Name' column)
    """
    try:
        # Check file extension
        file_name = file.name.lower()

        if file_name.endswith(".csv"):
            # Read CSV file directly
            data_df = pd.read_csv(file)
        else:
            # Read the DATA tab from Excel file (try both uppercase and lowercase)
            xls = pd.ExcelFile(file)
            sheet_names = xls.sheet_names

            # Try to find DATA sheet (case-insensitive)
            data_sheet = None
            for sheet in sheet_names:
                if sheet.upper() == "DATA":
                    data_sheet = sheet
                    break

            if data_sheet is None:
                # If no DATA sheet found, use first sheet
                if len(sheet_names) > 0:
                    data_sheet = sheet_names[0]
                else:
                    raise ValueError("No sheets found in Excel file")

            data_df = pd.read_excel(file, sheet_name=data_sheet)

        # Add source file name column
        data_df["Source File Name"] = file.name

        return data_df

    except Exception as e:
        raise ValueError(f"Error loading transaction file: {str(e)}")


def load_multiple_transaction_files(files) -> pd.DataFrame:
    """
    Load and combine transaction data from multiple Excel files.

    Args:
        files: List of file objects from Streamlit file uploader

    Returns:
        Combined DataFrame with all transaction data
    """
    all_data = []

    for file in files:
        try:
            data_df = load_transaction_file(file)
            all_data.append(data_df)
        except Exception as e:
            print(f"Warning: Could not load {file.name}: {str(e)}")
            continue

    if not all_data:
        raise ValueError("No transaction files could be loaded successfully")

    # Combine all dataframes
    combined_df = pd.concat(all_data, ignore_index=True)

    # Remove duplicates based on Transaction ID if present
    if "Transaction ID" in combined_df.columns:
        combined_df = combined_df.drop_duplicates(
            subset=["Transaction ID"], keep="first"
        )

    return combined_df


def load_nxn_lookup_file(file) -> pd.DataFrame:
    """
    Load NXN lookup data from Excel or CSV file.

    Supports multiple formats:
    - CSV files with headers
    - Excel: NXN LINE ITEM ID DELIVERY LOOKUP sheet (or truncated version)
    - Excel: Programmatic sheet (Green Soul format)

    Excel formats have headers on row 2 (index 1).

    Args:
        file: File object from Streamlit file uploader

    Returns:
        DataFrame with NXN lookup data
    """
    try:
        # Check file extension
        file_name = file.name.lower()

        if file_name.endswith(".csv"):
            # Read CSV file directly
            # Specify dtype for line_item_id to preserve full precision of large integers
            nxn_lookup_df = pd.read_csv(
                file,
                dtype={"line_item_id": "Int64"},  # Use Int64 to preserve full precision
            )
        else:
            # Excel file - get sheet names
            xls = pd.ExcelFile(file)
            sheet_names = xls.sheet_names

            # Try different sheet names in order of preference
            sheet_name = None

            # First, try NXN format sheets
            if "NXN LINE ITEM ID DELIVERY LOOKUP" in sheet_names:
                sheet_name = "NXN LINE ITEM ID DELIVERY LOOKUP"
            elif "NXN LINE ITEM ID DELIVERY LOOKU" in sheet_names:
                # Excel sometimes truncates sheet names to 31 characters
                sheet_name = "NXN LINE ITEM ID DELIVERY LOOKU"
            # Then try Programmatic sheet (Green Soul format)
            elif "Programmatic" in sheet_names:
                sheet_name = "Programmatic"
            # Finally, try the first sheet if nothing else matches
            elif len(sheet_names) > 0:
                sheet_name = sheet_names[0]
            else:
                raise ValueError("No valid sheets found in file")

            # Read the lookup data - header is on row 2 (index 1), skip the first row
            # Specify dtype for line_item_id to preserve full precision of large integers
            nxn_lookup_df = pd.read_excel(
                file,
                sheet_name=sheet_name,
                header=1,
                dtype={"line_item_id": "Int64"},  # Use Int64 to preserve full precision
            )

        # Verify required columns exist
        required_columns = [
            "line_item_id",
            "line_item_name",
            "impressions",
            "advertiser_invoice",
        ]
        missing_columns = [
            col for col in required_columns if col not in nxn_lookup_df.columns
        ]

        if missing_columns:
            raise ValueError(
                f"Missing required columns: {', '.join(missing_columns)}. "
                f"Available columns: {', '.join(nxn_lookup_df.columns.tolist())}"
            )

        return nxn_lookup_df

    except Exception as e:
        raise ValueError(f"Error loading NXN lookup file: {str(e)}")


def export_to_excel(results_df: pd.DataFrame, output_path: str):
    """
    Export results DataFrame to Excel file.

    Args:
        results_df: DataFrame with analysis results
        output_path: Path to save the Excel file
    """
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        results_df.to_excel(
            writer,
            sheet_name="Dashboard Transactions Line Item Performance Report",
            index=False,
        )
