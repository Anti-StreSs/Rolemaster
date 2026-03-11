---
name: ghidra-explore
description: Systematic exploration of a binary via GhidrAssistMCP native MCP server
argument-hint: [analysis-target or specific-question]
allowed-tools: Read, Write, Bash, mcp__ghidra__*
---

# Ghidra MCP Exploration Skill (GhidrAssistMCP v2.0)

GhidrAssistMCP is a NATIVE MCP server running inside Ghidra on port 8080.
No external bridge needed — tools are called directly.

## Available Tools (34 total)

### Program & Data Listing
| Tool | Description |
|------|-------------|
| `get_program_info` | Program name, architecture, compiler, entry point |
| `list_programs` | All open programs across CodeBrowser windows |
| `list_functions` | Functions with optional pattern filter + pagination |
| `list_data` | Data definitions |
| `list_data_types` | All available data types |
| `list_strings` | String references with optional filtering |
| `list_imports` | Imported functions/symbols (VBRUN300 ordinals!) |
| `list_exports` | Exported functions/symbols |
| `list_segments` | Memory segments |
| `list_namespaces` | Namespaces |
| `list_relocations` | Relocation entries |

### Function & Code Analysis
| Tool | Description |
|------|-------------|
| `get_function_info` | Detailed function info (signature, variables) |
| `get_current_function` | Function at cursor position |
| `get_current_address` | Current cursor address |
| `get_hexdump` | Hex dump at address |
| `get_call_graph` | Callers and callees of a function |
| `get_basic_blocks` | Basic block info for a function |

### Consolidated Tools
| Tool | Parameters | Description |
|------|-----------|-------------|
| `get_code` | format=decompiler/disassembly/pcode | Code in multiple formats |
| `xrefs` | address OR function | Cross-references to/from |
| `struct` | action=create/modify/merge/auto_create/... | Structure operations |
| `class` | action=list/get_info | Class operations |
| `rename_symbol` | target_type=function/data/variable | Rename symbols |
| `set_comment` | target=function/address | Add comments |
| `bookmarks` | action=list/add/delete | Bookmark management |

### Type & Prototype
| Tool | Description |
|------|-------------|
| `get_data_type` | Detailed data type info |
| `delete_data_type` | Delete a data type |
| `set_data_type` | Set data type at address |
| `set_function_prototype` | Set function signature |
| `set_local_variable_type` | Set local variable type |

### Search & Tasks
| Tool | Description |
|------|-------------|
| `search_bytes` | Search byte patterns in memory |
| `get_task_status` | Check async task results |
| `cancel_task` | Cancel running task |
| `list_tasks` | List all tasks |

## MCP Resources (read-only data)
| URI | Content |
|-----|---------|
| `ghidra://program/info` | Program metadata |
| `ghidra://program/functions` | All functions |
| `ghidra://program/strings` | All strings |
| `ghidra://program/imports` | All imports |
| `ghidra://program/exports` | All exports |

## Workflow Pattern

1. **Connect**: Verify `http://localhost:8080/sse` responds
2. **Identify**: `get_program_info` to confirm CPR093.exe is loaded
3. **Map**: `list_segments` + `list_imports` for the big picture
4. **Enumerate**: `list_strings` + `list_functions` + `list_data`
5. **Analyze**: `get_code` (decompile/disassemble), `xrefs`, `get_call_graph`
6. **Deep-dive**: `get_hexdump` at interesting addresses
7. **Record**: Save all outputs before analysis

## CPR093-Specific Knowledge

- Only 2 decompilable functions (entry, Ordinal_100) — P-Code limitation
- Real value: imports (VBRUN300 ordinals), strings, data items, memory layout
- Segment 15c4 = game data, 18aa = UI strings
- Use `get_code` with format=pcode to see P-Code representation
- Use `list_imports` to map ALL VBRUN300 ordinals
