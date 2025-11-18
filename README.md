# The Oracle - Campaign Performance Tool

A modern Next.js application for analyzing campaign performance with line item and creative reports. Converted from a Streamlit application to provide better scalability, team collaboration, and deployment options.

## Features

- **File Upload**: Upload CSV and Excel files (transaction data and NXN lookup files)
- **Data Processing**: Extract LINEITEMID values from JSON impression data and aggregate transaction metrics
- **Performance Reports**: Generate detailed line item performance reports with ROAS calculations
- **Team Collaboration**: Share files and reports with team members
- **Export**: Download reports as Excel or CSV files
- **Authentication**: Secure team-based authentication with NextAuth.js
- **Persistent Storage**: Files stored in Vercel Blob, metadata in Vercel Postgres

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: React + Shadcn/UI + Tailwind CSS
- **File Storage**: Vercel Blob Storage
- **Database**: Vercel Postgres
- **Authentication**: NextAuth.js
- **File Processing**: TypeScript (xlsx, papaparse libraries)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Vercel account (for deployment)
- Vercel Postgres database
- Vercel Blob storage

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd the-oracle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- `NEXTAUTH_URL`: Your application URL (e.g., `http://localhost:3000` for local dev)
- `NEXTAUTH_SECRET`: A random secret string (generate with `openssl rand -base64 32`)
- `POSTGRES_URL`: Your Vercel Postgres connection string
- `POSTGRES_PRISMA_URL`: Your Vercel Postgres Prisma connection string
- `POSTGRES_URL_NON_POOLING`: Your Vercel Postgres non-pooling connection string
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob read/write token

4. Initialize the database:
```bash
# Run the schema SQL file against your Postgres database
# You can use psql or the Vercel dashboard SQL editor
psql $POSTGRES_URL -f lib/db/schema.sql
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).

2. Import your project in the [Vercel Dashboard](https://vercel.com/new).

3. Add environment variables in the Vercel project settings:
   - `NEXTAUTH_URL`: Your production URL
   - `NEXTAUTH_SECRET`: Generate a secure secret
   - `POSTGRES_URL`: From your Vercel Postgres database
   - `POSTGRES_PRISMA_URL`: From your Vercel Postgres database
   - `POSTGRES_URL_NON_POOLING`: From your Vercel Postgres database
   - `BLOB_READ_WRITE_TOKEN`: From your Vercel Blob storage

4. Deploy! Vercel will automatically build and deploy your application.

## Database Setup

The application uses the following database schema (defined in `lib/db/schema.sql`):

- **users**: User accounts with team associations
- **teams**: Team/organization information
- **uploaded_files**: File metadata and blob URLs
- **reports**: Generated report metadata and data
- **file_shares**: File sharing permissions
- **report_shares**: Report sharing permissions

Run the schema SQL file against your Postgres database to create these tables.

## File Format Requirements

### Transaction Detail Files

**Supported Formats**: Excel (.xlsx, .xls) or CSV (.csv)

**Required Columns**:
- `Transaction ID`: Unique transaction identifier
- `Transaction Total`: Transaction amount
- `Impressions`: JSON array of impression objects containing LINEITEMID

**Excel files**: Must contain a **DATA** tab (case-insensitive)

**CSV files**: Headers in first row

### NXN Lookup File

**Supported Formats**: Excel (.xlsx, .xls) or CSV (.csv)

**Required Columns**:
- `line_item_id`: Line item identifier (matches LINEITEMID from impressions)
- `line_item_name`: Friendly name for the line item
- `impressions`: Impression count
- `advertiser_invoice`: DSP spend amount

**Excel files**: Supports:
- **NXN LINE ITEM ID DELIVERY LOOKUP** sheet
- **Programmatic** sheet (Green Soul format)
- Headers on row 2 (index 1)

**CSV files**: Headers in first row

## How It Works

1. **Upload Files**: Users upload transaction files and NXN lookup files
2. **Process Data**: The system extracts LINEITEMID values from JSON impression data
3. **Aggregate**: Transactions are aggregated by line item with counts and totals
4. **Enrich**: Data is enriched with NXN lookup information (names, spend, impressions)
5. **Calculate Metrics**: Influenced ROAS is calculated for each line item
6. **Generate Report**: Results are displayed in an interactive table with filtering and sorting
7. **Export**: Reports can be exported as Excel or CSV files

## Project Structure

```
the-oracle/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/            # Auth pages
│   ├── reports/           # Reports page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   └── ...               # Feature components
├── lib/                   # Utility libraries
│   ├── db/               # Database utilities
│   ├── exporters/        # Export functionality
│   ├── file-parsers.ts   # File parsing utilities
│   ├── processors/       # Data processing logic
│   └── storage.ts        # Blob storage utilities
└── types/                 # TypeScript type definitions
```

## Development

### Running Tests

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## License

[Your License Here]

## Support

For issues or questions, please open an issue in the repository.
