# Log Analyzer

A powerful, cross-platform desktop application built with **Electron**, **React**, and **TypeScript** for analyzing large-scale measurement logs. It provides interactive dashboards, advanced filtering, and detailed statistical insights.

![Dashboard Preview](public/electron-vite.svg)

## Features

### Interactive Dashboard
- **Measurements Overview**: Visualize total measurement counts and success rates.
- **Time Analysis (Trend)**: Interactive stacked bar chart (Success vs. Failed) with toggleable **Daily/Hourly** views.
- **Distribution Analysis**: Pie charts showing distribution by **Measurement Group**.
- **Failure Analysis**: Top error codes and descriptions visualization.
- **Key Performance Indicators (KPIs)**: Instant access to Success Rate, Average Duration, and Uncertainty metrics.

### Advanced Log Management
- **High-Performance Grid**: Efficiently handle and scroll through large datasets using virtualization.
- **Smart Filtering**: Filter logs by Date Range, Status (Success/Fail), Error Description, Measurement Group, and more.
- **File & Folder Organization**: Import raw log files, organize them into folders, and manage your workspace efficiently.
- **Excel Export**: Export filtered datasets or full logs to Excel (`.xlsx`) for external reporting.

### Technical Highlights
- **Cross-Platform**: Runs smoothly on macOS and Windows.
- **Local Database**: Powered by `better-sqlite3` for fast, offline-first data storage.
- **Native Performance**: Built on Electron with a high-performance React frontend.

## Log Format & Customization

**Important:** This application is currently tailored to a specific Tab-Separated Values (TSV) log format used in our production environment. 

However, the architecture is **modular**. You can easily adapt it to your own log formats (CSV, JSON, etc.) by modifying two files:

1.  **Parser Logic**: Update `electron/utils/logParser.ts` to match your file structure.
2.  **Database Schema**: Update `electron/database/init.ts` and `electron/database/service.ts` to reflect your new data fields.

This makes the project a perfect **boilerplate** for building custom log analysis tools.

## Installation

You can download the latest version for your operating system from the [Releases](https://github.com/alierenkonak/Log-analyzer/releases) page.

- **macOS**: Download `.dmg` file.
- **Windows**: Download `.exe` file.

## Development

If you want to run the project locally or contribute:

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/alierenkonak/Log-analyzer.git
   cd Log-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in Development Mode**
   ```bash
   npm run dev
   ```
   This will start both the Electron backend and React frontend with hot-reload enabled.

4. **Build for Production**
   ```bash
   npm run build
   ```
   This command creates the executable files in the `dist-build` directory.

## Architecture

- **Frontend**: React, TypeScript, Tailwind CSS, Recharts, Shadcn UI (Radix)
- **Backend (Main Process)**: Electron, Node.js, `better-sqlite3`
- **Build Tool**: Vite, Electron Builder

## License

[MIT](LICENSE)
