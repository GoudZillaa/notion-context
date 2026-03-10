# Notion Context (@goudzillaa/notion-context)

A powerful CLI tool that fetches your data from Notion and generates highly structured, local context files for AI assistants (like ChatGPT, Claude, GitHub Copilot).

It uses advanced content classification and heuristic scoring to intelligently differentiate between "Tasks" and "Notes" within your Notion workspace, splitting sections appropriately, and dropping the results into a `.project-context/` directory.

## Features

- **🚀 Quick Setup**: Interactive `init` command to authenticate and set up your workspace.
- **🧠 Smart Content Classification**: Automatically detects whether a Notion block/page is a Task or a Note based on structural, content, and context signals.
- **✂️ Section-Level Splitting**: Handles mixed-content pages containing both notes and tasks, creating separate context entries.
- **🔄 Easy Syncing**: Run `notion-context sync` to pull your latest tracking data with a single command.
- **🩺 Health Checks**: Built-in `doctor` command to diagnose configuration, permissions, and network issues.
- **⚙️ Customizable Rules**: Tune the weighting and thresholds for task vs. note classification.

## Installation

Install the package globally via npm:

```bash
npm install -g @goudzillaa/notion-context
```

Or run it directly using `npx`:

```bash
npx @goudzillaa/notion-context init
```

### Local Development
If you've cloned the repository and want to run it locally:
```bash
npm install
npm run build
npm link
```
This will install dependencies, build the project, and create a global symlink so you can use the `notion-context` command directly from your terminal.

## Quick Start

### 1. Initialize Context

Run the `init` command in your project repository. You will be prompted for your Notion Integration Secret (starts with `secret_...`):

```bash
notion-context init
```

*Note: You need to create a Notion Integration at [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations) and share the relevant Pages or Databases with your new integration.*

### 2. Sync Data

Run the `sync` command to pull your pages and databases into a local context file:

```bash
notion-context sync
```

If it's your first time running `sync` (or if you haven't tracked any pages yet), an interactive menu will appear showing all pages accessible to your integration, allowing you to select which ones to track.

Once pulled, you can find the generated context in:
`.project-context/context.md`
`.project-context/metadata.json`

## Commands Usage

| Command | Description |
|---|---|
| `notion-context init` | Initializes the `.project-context` directory and prompts for your Notion token. |
| `notion-context sync` | Fetches data from tracked Notion pages/databases and generates local AI context. |
| `notion-context status` | Displays your current configuration, tracked items, and last sync timestamp. |
| `notion-context doctor` | Diagnoses your setup (validates token, checks permissions, checks folder access). |
| `notion-context reset` | Deletes your current configuration, allowing you to start fresh. |

## Configuration & Classification

`notion-context` stores its configuration in `.project-context/config.json`. 

You can manually add or override the classification settings by adding a `classification` object to your config:

```json
{
  "notionToken": "secret_...",
  "trackedPages": ["page-id-1"],
  "trackedDatabases": [],
  "lastSync": "2023-10-27T10:00:00.000Z",
  "classification": {
    "weights": {
      "statusProperty": 0.9,
      "todoBlocks": 0.8,
      "headerKeywords": 0.6,
      "contentVerbs": 0.4,
      "dateProperties": 0.7
    },
    "thresholds": {
      "task": 0.6,
      "note": 0.4
    }
  }
}
```

### How Smart Classification Works

When syncing, `notion-context` analyzes your blocks and applies a **weighted scoring system** based on three signal types:

1. **Structural Signals**: Does it have database properties like `Status`, `Due Date`, or `Priority`?
2. **Content Signals**: Does the block contain checkboxes (`- [ ]`)? Does the text start with action verbs (e.g., "Implement", "Fix", "Update")?
3. **Context Signals**: Is the block located under a heading titled "Tasks" or "To Do"?

Based on the accumulated confidence score against the configured thresholds, the item will be categorized as a `task`, `note`, or `hybrid` and structured seamlessly for your AI assistant to read.

## Troubleshooting

### "running scripts is disabled on this system" (Windows)
When running the `notion-context` command globally on Windows for the first time, PowerShell might block the execution. 
To fix this, open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### No pages or databases found during sync
If `notion-context sync` reports that it can't find any content, ensure you have actively **shared** your Notion pages with your Integration:
1. Open the Notion page/database you want to track.
2. Click the `...` menu in the top right.
3. Under "Connections", click **"Add connections"**.
4. Search for your Integration name and add it.

### Notion token missing or invalid
If you receive authentication errors, you can always reset your configuration and start over:
```bash
notion-context reset
notion-context init
```

## License

MIT License. See `LICENSE` for more information.
