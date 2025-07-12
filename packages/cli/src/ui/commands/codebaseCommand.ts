/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlashCommand, CommandContext, MessageActionReturn, ToolActionReturn } from './types.js';

/**
 * Command for codebase analysis and file summarization
 */
export const codebaseCommand: SlashCommand = {
  name: 'codebase',
  description: 'Analyze project structure, dependencies, and generate file summaries',
  action: (context: CommandContext, args: string) => {
    if (!args.trim()) {
      return showCodebaseHelp(context);
    }
    
    return {
      type: 'message',
      messageType: 'info',
      content: 'Use `/codebase analyze`, `/codebase summary`, `/codebase deps`, or `/codebase arch`',
    };
  },
  completion: async (_context: CommandContext, partialArg: string) => {
    const subCommands = [
      'analyze', 'summary', 'deps', 'arch', 'list',
      'check', 'auto-update', 'context', 'help'
    ];
    return subCommands.filter(cmd => cmd.startsWith(partialArg.toLowerCase()));
  },
  subCommands: [
    {
      name: 'analyze',
      description: 'Perform comprehensive codebase analysis',
      action: (context: CommandContext, args: string) => {
        return executeCodebaseAnalysis(context, 'analyze', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'summary',
      description: 'Generate or view file summaries',
      action: (context: CommandContext, args: string) => {
        return executeFileSummarization(context, 'summarize', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--refresh', '--force', '--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'deps',
      description: 'Analyze project dependencies',
      action: (context: CommandContext, args: string) => {
        return executeCodebaseAnalysis(context, 'dependencies', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'arch',
      description: 'Analyze project architecture',
      action: (context: CommandContext, args: string) => {
        return executeCodebaseAnalysis(context, 'architecture', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'list',
      description: 'List existing file summaries',
      action: (context: CommandContext, args: string) => {
        return executeFileSummarization(context, 'list', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'refresh',
      description: 'Refresh all file summaries',
      action: (context: CommandContext, args: string) => {
        return executeFileSummarization(context, 'refresh', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'check',
      description: 'Check for file changes that need summary updates',
      action: (context: CommandContext, args: string) => {
        return executeFileSummarization(context, 'check_changes', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--threshold', '--max-size', '--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'auto-update',
      description: 'Automatically update summaries for changed files',
      action: (context: CommandContext, args: string) => {
        return executeFileSummarization(context, 'auto_update', args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--threshold', '--max-size', '--path'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'context',
      description: 'Show current codebase context available to AI',
      action: (context: CommandContext, args: string) => {
        return executeCodebaseContext(context, args);
      },
      completion: async (_context: CommandContext, partialArg: string) => {
        const options = ['--cache'];
        return options.filter(opt => opt.startsWith(partialArg.toLowerCase()));
      },
    },
    {
      name: 'help',
      description: 'Show detailed help for codebase commands',
      action: showCodebaseHelp,
    },
  ],
};

function showCodebaseHelp(_context: CommandContext): MessageActionReturn {
  const helpText = `# Fumbly AI Codebase Analysis

## Available Commands:

### \`/codebase analyze [path]\`
Performs comprehensive codebase analysis including:
- Project architecture detection
- Dependency analysis
- File summaries (if enabled)
- Framework and pattern detection

### \`/codebase summary [options]\`
Generates intelligent summaries for all files in the project:
- \`--refresh\` - Force refresh of existing summaries
- \`--path <path>\` - Summarize specific directory
- Automatically detects file changes and updates summaries

### \`/codebase deps [path]\`
Analyzes project dependencies:
- Package.json (Node.js)
- Requirements.txt (Python)
- Cargo.toml (Rust)
- Build.gradle (Java/Kotlin)
- And more...

### \`/codebase arch [path]\`
Analyzes project architecture:
- Directory structure
- File organization patterns
- Framework detection
- Language identification

### \`/codebase list [path]\`
Lists existing file summaries with timestamps

### \`/codebase refresh [path]\`
Forces refresh of all file summaries

### \`/codebase check [options]\`
Checks for file changes that need summary updates:
- \`--threshold <value>\` - Change threshold (0-1, default: 0.3)
- \`--max-size <bytes>\` - Maximum file size to process

### \`/codebase auto-update [options]\`
Automatically updates summaries for files with significant changes:
- Uses intelligent change detection
- Only updates files above the change threshold
- Skips binary files and very large files

### \`/codebase context [--cache]\`
Shows current codebase context integration status:
- \`--cache\` - Show cache status and timing information
- Displays what context information is available to the AI

## Examples:
\`\`\`
/codebase analyze                    # Analyze entire project
/codebase summary --refresh          # Refresh all summaries
/codebase deps                       # Show dependencies
/codebase arch src/                  # Analyze src/ architecture
/codebase list                       # Show all summaries
/codebase check --threshold 0.4      # Check for changes with custom threshold
/codebase auto-update                # Auto-update changed summaries
/codebase context                    # Show AI context integration status
/codebase context --cache            # Show cache status
\`\`\`

## Smart Features:
- **Intelligent Change Detection**: Analyzes file changes and determines significance
- **Automatic Updates**: Only updates summaries when changes exceed threshold
- **Smart Filtering**: Ignores binary files, node_modules, and oversized files
- **Context Integration**: Summaries are available to the AI for better assistance
- **Efficient Caching**: Prevents unnecessary re-analysis and API calls
- **Configurable Thresholds**: Customize sensitivity for change detection
`;

  return {
    type: 'message',
    messageType: 'info',
    content: helpText,
  };
}

function executeCodebaseAnalysis(
  _context: CommandContext,
  action: string,
  args: string
): ToolActionReturn {
  // Parse arguments
  const parsedArgs = parseArgs(args);

  // Request codebase analysis tool execution
  const toolParams = {
    action,
    target_path: parsedArgs.path,
    include_summaries: action === 'analyze' ? true : false,
    force_refresh: parsedArgs.refresh || parsedArgs.force || false,
  };

  return {
    type: 'tool',
    toolName: 'codebase_analysis',
    toolArgs: toolParams,
  };
}

function executeFileSummarization(
  _context: CommandContext,
  action: string,
  args: string
): ToolActionReturn {
  // Parse arguments
  const parsedArgs = parseArgs(args);

  // Request file summarization tool execution
  const toolParams: any = {
    action,
    target_path: parsedArgs.path,
    force_refresh: parsedArgs.refresh || parsedArgs.force || false,
  };

  // Add optional parameters if provided
  if (parsedArgs.threshold !== undefined) {
    toolParams.change_threshold = parsedArgs.threshold;
  }
  if (parsedArgs.maxSize !== undefined) {
    toolParams.max_file_size = parsedArgs.maxSize;
  }

  return {
    type: 'tool',
    toolName: 'file_summarization',
    toolArgs: toolParams,
  };
}

function parseArgs(args: string): {
  path?: string;
  refresh?: boolean;
  force?: boolean;
  threshold?: number;
  maxSize?: number;
} {
  const result: {
    path?: string;
    refresh?: boolean;
    force?: boolean;
    threshold?: number;
    maxSize?: number;
  } = {};

  if (!args.trim()) {
    return result;
  }

  const tokens = args.trim().split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token === '--refresh') {
      result.refresh = true;
    } else if (token === '--force') {
      result.force = true;
    } else if (token === '--path' && i + 1 < tokens.length) {
      result.path = tokens[i + 1];
      i++; // Skip next token as it's the path value
    } else if (token === '--threshold' && i + 1 < tokens.length) {
      result.threshold = parseFloat(tokens[i + 1]);
      i++; // Skip next token as it's the threshold value
    } else if (token === '--max-size' && i + 1 < tokens.length) {
      result.maxSize = parseInt(tokens[i + 1], 10);
      i++; // Skip next token as it's the max size value
    } else if (!token.startsWith('--') && !result.path) {
      // First non-flag argument is treated as path
      result.path = token;
    }
  }

  return result;
}

function executeCodebaseContext(
  context: CommandContext,
  args: string
): MessageActionReturn {
  const config = context.services.config;

  if (!config) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available',
    };
  }

  const codebaseService = config.getCodebaseContextService();

  if (!codebaseService) {
    return {
      type: 'message',
      messageType: 'info',
      content: 'Codebase context service not initialized. The AI will use basic project information.',
    };
  }

  // Parse arguments for options
  const showCache = args.includes('--cache') || args.includes('-c');

  if (showCache) {
    const cacheStatus = codebaseService.getCacheStatus();
    const cacheInfo = `# Codebase Context Cache Status

**Cached**: ${cacheStatus.cached ? 'Yes' : 'No'}
**Cache Age**: ${Math.round(cacheStatus.age / 1000)}s
**Cache Expires**: ${cacheStatus.cached ? `${Math.round(cacheStatus.expires / 1000)}s` : 'N/A'}

${cacheStatus.cached ? 'Context is being served from cache.' : 'Context will be generated fresh on next request.'}`;

    return {
      type: 'message',
      messageType: 'info',
      content: cacheInfo,
    };
  }

  // Show a message that context will be generated
  return {
    type: 'message',
    messageType: 'info',
    content: `# Codebase Context Integration

The AI now has access to enhanced codebase context including:

✅ **Project Architecture Analysis**
- Framework detection with confidence scores
- Language identification
- Build system analysis
- Architectural pattern recognition

✅ **Dependency Analysis**
- Package.json, requirements.txt, Cargo.toml, etc.
- Development vs production dependencies
- Version information

✅ **File Summaries** (when available)
- Intelligent summaries of project files
- Automatic updates when files change significantly
- Smart filtering to avoid binary/large files

✅ **Smart Caching**
- Context is cached for 5 minutes to improve performance
- Automatic refresh when significant changes detected

## Usage
The codebase context is automatically included in all AI interactions. You can:

- Use \`/codebase context --cache\` to check cache status
- Use \`/codebase analyze\` to see the full analysis
- Use \`/codebase summary\` to manage file summaries

The AI will use this context to provide more accurate, project-specific assistance.`,
  };
}
