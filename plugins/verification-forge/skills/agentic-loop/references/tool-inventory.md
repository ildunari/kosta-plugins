# Tool Inventory — Common Productivity Tools

> **Plugin note:** The verification-forge plugin includes its own scripts that automate common verification and integrity tasks. These are listed in the Scripts section of the main SKILL.md and include: `claim_ledger.py` (create, update, and verify claim ledgers), `stale_value_finder.py` (search for deprecated values across files), `citation_integrity_check.py` (diff citations between document versions), `cross_doc_consistency_checker.py` (compare metrics across documents), and `doc_structure_audit.py` (validate heading hierarchy and section completeness). Check the plugin's `scripts/` directory for availability and usage.

This is a reference catalog of tools commonly available for productivity work. It is not a dependency list — the skill works with whatever tools are available. Use this to identify what capabilities exist and what to suggest when a needed capability is missing.

## Document Editing

| Capability | Common Tools | Notes |
|-----------|-------------|-------|
| Read/write .docx files | MCP Word servers (che-word-mcp), python-docx, pandoc, docx-tool CLI, markitdown | MCP servers provide the most interactive experience. python-docx is good for scripted operations. markitdown converts to readable markdown for analysis |
| Read/write .xlsx files | MCP Excel servers (swift-excel-mcp), openpyxl, xlsx-tool CLI | MCP servers for interactive editing. openpyxl for scripted operations |
| Read/convert any document | markitdown CLI | Converts .docx, .xlsx, .pptx, .pdf, .html, .ipynb to markdown. Universal first-pass reader |
| PDF operations | pdf-tool CLI, PyPDF2, pdfplumber | Extract text, merge/split, get metadata. For complex PDF manipulation, Python libraries are more capable |
| PowerPoint operations | pptx-tool CLI, python-pptx | Read/create presentations |
| Image processing | img-tool CLI, Pillow | Resize, convert, extract metadata |
| Document comparison | doc-diff CLI | Compare two versions of a document |
| Calendar/scheduling files | ical-tool CLI | Read .ics files |

## Scientific & Lab Tools

| Capability | Common Tools | Notes |
|-----------|-------------|-------|
| Reference management | Zotero MCP, BibTeX parsers | Zotero MCP provides direct database access for citation lookup and management |
| Statistical analysis | Python (scipy, statsmodels, pandas) | For computations that Excel can't handle or that need reproducibility |
| Data visualization | Python (matplotlib, seaborn), R (ggplot2) | Publication-quality figures |
| LaTeX compilation | pdflatex, xelatex, latexmk | For manuscript preparation in LaTeX |
| Image analysis | ImageJ/Fiji (via macro), Python (scikit-image) | For quantitative image analysis in lab contexts |
| MATLAB interop | MATLAB CLI, Python (scipy for .mat files) | Read/write .mat files, run MATLAB scripts |

## Web & Research Tools

| Capability | Common Tools | Notes |
|-----------|-------------|-------|
| Web search | WebSearch, Exa, browser tools | For finding current information, verifying facts |
| Web scraping/reading | browser_tool, WebFetch | For reading web-based documentation or data |
| Google Workspace | gog CLI (gmail, drive, docs, sheets, calendar) | For working with Google-hosted documents |

## Automation & System Tools

| Capability | Common Tools | Notes |
|-----------|-------------|-------|
| macOS automation | AppleScript, JXA, Shortcuts | For GUI automation when programmatic tools can't handle an operation |
| File management | Standard CLI (cp, mv, mkdir, find) | For organizing documents, creating backups |
| Git version control | git CLI | For tracking changes to text-based files (markdown, LaTeX, code) |

## When a Tool is Missing

If the task requires a capability that no available tool provides:

1. **Check if a Python library can fill the gap.** Many document operations can be done with pip-installable packages (python-docx, openpyxl, PyPDF2, etc.)
2. **Check if a CLI tool is already installed** but not registered as an MCP server. Common ones: markitdown, pandoc, pdflatex.
3. **Suggest installation** if appropriate. Frame it as: "To do [operation], we'd need [tool]. Would you like me to install it, or should we use an alternative approach?"
4. **Propose a workaround** if installation isn't practical. For example: export to a format the available tools can handle, make changes, and convert back.
5. **Note it for the user** if the gap is a recurring need — they may want to set up the tool permanently.
