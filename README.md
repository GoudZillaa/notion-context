# notion-context

A CLI tool to fetch Notion data and generate local context files for AI assistants.

## Overview

`notion-context` is a deterministic, local developer tool that:
- Fetches data from your Notion workspace
- Normalizes it into a clean format
- Generates context files on disk for use with AI coding assistants

## 🧠 How Classification Works

`notion-context` uses a smart, 3-tier detection system to categorize content as **Tasks** or **Notes**. It doesn't just look at the page title; it analyzes the content structure.

### 1. Structural Splitting
A single Notion page can generate multiple context items. The tool splits pages based on:
- **Columns**: If you use a 2-column layout (e.g., Tasks on left, Notes on right), they are split into separate items.
- **Headers**: `H2` headings (e.g., `## Tasks`, `## Resources`) act as dividers.
- **Toggles/Callout Blocks**: These are treated as independent sections.

### 2. Detection Logic (Priority Order)
Once split, each section is analyzed to determine if it's a Task or a Note:

1.  **Page Properties (High Priority)**
    - If a database page has a **Status** property (e.g., "In Progress", "Done"), the entire page is treated as a **Task**.

2.  **Explicit Headlines (Medium Priority)**
    - The tool checks section headers for keywords:
        - **Task Keywords**: `task`, `todo`, `action`, `checklist`
        - **Note Keywords**: `note`, `info`, `reference`, `context`

3.  **Content Analysis (High Priority)**
    - It scans the distinct blocks within the section.
    - If it finds **checkboxes (Todo blocks)**, it classifies the section as a **Task**.

4.  **Fallback**
    - If none of the above match, it defaults to a **Note**.

### Example
**Input (Notion Page):**
```markdown
# Project Alpha
(2-column layout)
[Column 1]          [Column 2]
## Action Items     ## References
[ ] Fix Login       - API Docs
[ ] Ship v1         - Design Spec
```

**Output:**
- `tasks.json`: Contains "Action Items" (Classified by header keyword + checkboxes)
- `notes.json`: Contains "References" (Classified by header keyword)

## Installation

```bash
# Install dependencies
npm install

# Link the package so you can use the 'notion-context' command globally
npm link

# Development mode (run without linking)
npm run dev -- --help
npm run dev sync
```

## Usage

### First-time Setup

Initialize the tool with your Notion integration token:

```bash
notion-context init
```

You'll need:
1. A Notion integration token (get it from https://www.notion.so/my-integrations)
2. Share your Notion pages/databases with the integration

### Commands

**`init`** - Initialize configuration
```bash
notion-context init
```

**`sync`** - Fetch Notion data and generate context files (coming in Step 4-7)
```bash
notion-context sync
```

**`status`** - Show current configuration and sync status
```bash
notion-context status
```

**`doctor`** - Run health checks on your setup
```bash
notion-context doctor
```

**`reset`** - Delete configuration
```bash
notion-context reset
```

**`--help`** - Show help information
```bash
notion-context --help
```

**`--version`** - Show version
```bash
notion-context --version
```

## Configuration

Configuration is stored at `~/.notion-context/config.json`

```json
{
  "notionToken": "your-token-here",
  "trackedPages": [],
  "trackedDatabases": [],
  "lastSync": null
}
```

## Development Roadmap

- ✅ **Step 1**: CLI scaffolding
- ✅ **Step 2**: Config management
- ✅ **Step 3**: Init command
- ⏳ **Step 4**: Notion client integration
- ⏳ **Step 5**: Normalization engine
- ⏳ **Step 6**: Context generation
- ⏳ **Step 7**: Sync command

## License

MIT
