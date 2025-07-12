/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseTool, ToolResult } from './tools.js';
import { Type } from '@google/genai';
import { Config } from '../config/config.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { getErrorMessage } from '../utils/errors.js';
import { createHash } from 'crypto';
import { GeminiClient } from '../core/client.js';
import { GEMINI_CONFIG_DIR } from './memoryTool.js';
import { partListUnionToString } from '../core/geminiRequest.js';

interface FileSummarizationParams {
  action: 'summarize' | 'list' | 'refresh' | 'get' | 'check_changes' | 'auto_update';
  target_path?: string;
  file_path?: string;
  force_refresh?: boolean;
  change_threshold?: number; // Threshold for determining significant changes (0-1)
  max_file_size?: number; // Maximum file size to process (in bytes)
}

interface FileSummary {
  path: string;
  summary: string;
  contentHash: string;
  lastUpdated: string;
  size: number;
  changeScore?: number; // Score indicating how much the file has changed
  lastChecked?: string; // Last time we checked for changes
  updateCount?: number; // Number of times this summary has been updated
}

const SUMMARY_DIR = path.join(GEMINI_CONFIG_DIR, 'summaries');
const SUMMARY_INDEX_FILE = 'summary_index.json';

/**
 * Tool for generating and managing intelligent file summaries
 */
export class FileSummarizationTool extends BaseTool<FileSummarizationParams, ToolResult> {
  static readonly Name: string = 'file_summarization';

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      FileSummarizationTool.Name,
      'File Summarization',
      'Generates and manages intelligent summaries of files in the project, automatically updating when files change significantly',
      {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['summarize', 'list', 'refresh', 'get', 'check_changes', 'auto_update'],
            description: 'Action to perform: summarize (create summaries), list (show existing summaries), refresh (update summaries), get (retrieve specific summary), check_changes (detect file changes), auto_update (automatically update changed summaries)',
          },
          target_path: {
            type: Type.STRING,
            description: 'Optional: Directory to summarize (relative to project root). If not provided, summarizes entire project.',
          },
          file_path: {
            type: Type.STRING,
            description: 'Optional: Specific file to summarize or get summary for (relative to project root).',
          },
          force_refresh: {
            type: Type.BOOLEAN,
            description: 'Force refresh of summaries even if files have not changed (default: false)',
          },
          change_threshold: {
            type: Type.NUMBER,
            description: 'Threshold for determining significant changes (0-1, default: 0.3). Higher values require more significant changes.',
          },
          max_file_size: {
            type: Type.NUMBER,
            description: 'Maximum file size to process in bytes (default: 1MB). Files larger than this will be skipped.',
          },
        },
        required: ['action'],
      },
    );
  }

  /**
   * Get the GeminiClient, throwing an error if it's not available
   */
  private getGeminiClient(): GeminiClient {
    const client = this.config.getGeminiClient();
    if (!client) {
      throw new Error('GeminiClient not initialized. Please ensure authentication is complete.');
    }
    return client;
  }

  async execute(params: FileSummarizationParams, signal: AbortSignal): Promise<ToolResult> {
    try {
      // Ensure summary directory exists
      await this.ensureSummaryDirectoryExists();

      switch (params.action) {
        case 'summarize':
          return await this.summarizeFiles(params, signal);
        case 'list':
          return await this.listSummaries(params);
        case 'refresh':
          return await this.refreshSummaries(params, signal);
        case 'get':
          return await this.getSummary(params);
        case 'check_changes':
          return await this.checkForChanges(params, signal);
        case 'auto_update':
          return await this.autoUpdateSummaries(params, signal);
        default:
          return {
            llmContent: `Unknown action: ${params.action}`,
            returnDisplay: `Error: Unknown summarization action "${params.action}"`,
          };
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error during file summarization: ${errorMessage}`,
        returnDisplay: `Summarization failed: ${errorMessage}`,
      };
    }
  }

  private async ensureSummaryDirectoryExists(): Promise<void> {
    const summaryDir = path.join(this.rootDirectory, SUMMARY_DIR);
    try {
      await fs.mkdir(summaryDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create summary directory: ${getErrorMessage(error)}`);
    }
  }

  private async summarizeFiles(
    params: FileSummarizationParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    const targetPath = params.target_path 
      ? path.resolve(this.rootDirectory, params.target_path)
      : this.rootDirectory;
    
    const specificFile = params.file_path 
      ? path.resolve(this.rootDirectory, params.file_path)
      : null;

    // Get existing summaries
    const existingSummaries = await this.loadSummaryIndex();
    
    // Find files to summarize
    const filesToSummarize = specificFile 
      ? [specificFile]
      : await this.findFilesToSummarize(targetPath, signal);
    
    if (filesToSummarize.length === 0) {
      return {
        llmContent: 'No files found to summarize.',
        returnDisplay: 'No files found to summarize.',
      };
    }

    // Generate summaries for each file
    const summaries: FileSummary[] = [];
    const newSummaries: FileSummary[] = [];
    const updatedSummaries: FileSummary[] = [];
    const skippedSummaries: string[] = [];

    for (const filePath of filesToSummarize) {
      try {
        const relativePath = path.relative(this.rootDirectory, filePath);
        const fileStats = await fs.stat(filePath);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const contentHash = this.generateContentHash(fileContent);
        
        // Check if we already have a summary for this file with the same hash
        const existingSummary = existingSummaries.find(s => s.path === relativePath);
        
        if (existingSummary && existingSummary.contentHash === contentHash && !params.force_refresh) {
          summaries.push(existingSummary);
          skippedSummaries.push(relativePath);
          continue;
        }

        // Generate a new summary
        const summary = await this.generateSummary(filePath, fileContent, signal);
        
        const fileSummary: FileSummary = {
          path: relativePath,
          summary,
          contentHash,
          lastUpdated: new Date().toISOString(),
          size: fileStats.size,
        };

        summaries.push(fileSummary);
        
        if (existingSummary) {
          updatedSummaries.push(fileSummary);
        } else {
          newSummaries.push(fileSummary);
        }
      } catch (error) {
        console.error(`Error summarizing file ${filePath}: ${getErrorMessage(error)}`);
      }
    }

    // Save the updated summary index
    await this.saveSummaryIndex(summaries);

    const result = `# File Summarization Results

## Summary
- Total files processed: ${filesToSummarize.length}
- New summaries generated: ${newSummaries.length}
- Summaries updated: ${updatedSummaries.length}
- Unchanged files (skipped): ${skippedSummaries.length}

## New Summaries
${newSummaries.map(s => `### ${s.path}\n${s.summary}`).join('\n\n')}

## Updated Summaries
${updatedSummaries.map(s => `### ${s.path}\n${s.summary}`).join('\n\n')}
`;

    return {
      llmContent: result,
      returnDisplay: result,
    };
  }

  private async listSummaries(params: FileSummarizationParams): Promise<ToolResult> {
    const summaries = await this.loadSummaryIndex();
    
    if (summaries.length === 0) {
      return {
        llmContent: 'No file summaries found.',
        returnDisplay: 'No file summaries found.',
      };
    }

    // Filter by target path if provided
    const filteredSummaries = params.target_path
      ? summaries.filter(s => s.path.startsWith(params.target_path!))
      : summaries;

    const result = `# File Summaries

Total summaries: ${filteredSummaries.length}

${filteredSummaries.map(s => `## ${s.path}\n${s.summary}\n\n*Last updated: ${s.lastUpdated}*`).join('\n\n')}
`;

    return {
      llmContent: result,
      returnDisplay: result,
    };
  }

  private async refreshSummaries(
    params: FileSummarizationParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    // Force refresh all summaries
    params.force_refresh = true;
    return this.summarizeFiles(params, signal);
  }

  private async getSummary(params: FileSummarizationParams): Promise<ToolResult> {
    if (!params.file_path) {
      return {
        llmContent: 'Error: file_path parameter is required for get action',
        returnDisplay: 'Error: Please specify a file path to get the summary for',
      };
    }

    const summaries = await this.loadSummaryIndex();
    const relativePath = params.file_path;
    
    const summary = summaries.find(s => s.path === relativePath);
    
    if (!summary) {
      return {
        llmContent: `No summary found for ${relativePath}`,
        returnDisplay: `No summary found for ${relativePath}`,
      };
    }

    const result = `# Summary for ${summary.path}

${summary.summary}

*Last updated: ${summary.lastUpdated}*
*File size: ${summary.size} bytes*
`;

    return {
      llmContent: result,
      returnDisplay: result,
    };
  }

  private async findFilesToSummarize(
    targetPath: string,
    signal: AbortSignal
  ): Promise<string[]> {
    try {
      const entries = await glob('**/*', {
        cwd: targetPath,
        absolute: true,
        nodir: true,
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.min.js',
          '**/*.map',
          '**/*.lock',
          '**/package-lock.json',
          '**/*.png',
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.gif',
          '**/*.svg',
          '**/*.ico',
          '**/*.woff',
          '**/*.ttf',
        ],
        signal,
      });

      // Filter out binary files and very large files
      const filteredFiles: string[] = [];
      for (const file of entries) {
        try {
          const stats = await fs.stat(file);
          // Skip files larger than 1MB
          if (stats.size > 1024 * 1024) {
            continue;
          }
          
          // Skip files that are likely binary
          const ext = path.extname(file).toLowerCase();
          if (['.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db'].includes(ext)) {
            continue;
          }
          
          filteredFiles.push(file);
        } catch (error) {
          console.error(`Error checking file ${file}: ${getErrorMessage(error)}`);
        }
      }

      return filteredFiles;
    } catch (error) {
      throw new Error(`Failed to find files to summarize: ${getErrorMessage(error)}`);
    }
  }

  private async generateSummary(
    filePath: string,
    content: string,
    signal: AbortSignal
  ): Promise<string> {
    try {
      // Use a simple prompt to generate a summary
      const fileExt = path.extname(filePath);
      const fileName = path.basename(filePath);
      
      const prompt = `Please provide a concise summary of this ${fileExt} file named "${fileName}". 
Focus on its purpose, key functionality, and structure. Keep the summary under 200 characters:

\`\`\`${fileExt}
${content.slice(0, 10000)} ${content.length > 10000 ? '... (truncated)' : ''}
\`\`\``;

      const geminiClient = this.getGeminiClient();
      const response = await geminiClient.generateContent(
        [{ role: 'user', parts: [{ text: prompt }] }],
        { temperature: 0.1, topP: 0.95, topK: 40 },
        signal
      );

      if (!response || !response.candidates || response.candidates.length === 0) {
        return 'Failed to generate summary.';
      }

      const summary = response.candidates[0]?.content?.parts
        ?.map((part: any) => part.text)
        ?.join('')
        ?.trim() || 'Failed to generate summary.';

      return summary;
    } catch (error) {
      console.error(`Error generating summary for ${filePath}: ${getErrorMessage(error)}`);
      return `Failed to summarize: ${getErrorMessage(error)}`;
    }
  }

  private generateContentHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  private async loadSummaryIndex(): Promise<FileSummary[]> {
    const indexPath = path.join(this.rootDirectory, SUMMARY_DIR, SUMMARY_INDEX_FILE);
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // If file doesn't exist or can't be parsed, return empty array
      return [];
    }
  }

  private async saveSummaryIndex(summaries: FileSummary[]): Promise<void> {
    const indexPath = path.join(this.rootDirectory, SUMMARY_DIR, SUMMARY_INDEX_FILE);
    try {
      await fs.writeFile(indexPath, JSON.stringify(summaries, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save summary index: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Check for changes in files and identify which summaries need updating
   */
  private async checkForChanges(
    params: FileSummarizationParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    const targetPath = params.target_path
      ? path.resolve(this.rootDirectory, params.target_path)
      : this.rootDirectory;

    const changeThreshold = params.change_threshold ?? 0.3;
    const maxFileSize = params.max_file_size ?? 1024 * 1024; // 1MB default

    // Get existing summaries
    const existingSummaries = await this.loadSummaryIndex();

    // Find all files in the target path
    const allFiles = await this.findFilesToSummarize(targetPath, signal);

    const changedFiles: string[] = [];
    const newFiles: string[] = [];
    const unchangedFiles: string[] = [];
    const skippedFiles: string[] = [];

    for (const filePath of allFiles) {
      try {
        const relativePath = path.relative(this.rootDirectory, filePath);
        const fileStats = await fs.stat(filePath);

        // Skip files that are too large
        if (fileStats.size > maxFileSize) {
          skippedFiles.push(relativePath);
          continue;
        }

        const existingSummary = existingSummaries.find(s => s.path === relativePath);

        if (!existingSummary) {
          newFiles.push(relativePath);
          continue;
        }

        // Check if file has changed significantly
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const currentHash = this.generateContentHash(fileContent);

        if (currentHash !== existingSummary.contentHash) {
          // Calculate change score based on file size difference and content hash
          const changeScore = this.calculateChangeScore(
            existingSummary.size,
            fileStats.size,
            existingSummary.contentHash,
            currentHash
          );

          if (changeScore >= changeThreshold) {
            changedFiles.push(relativePath);
          } else {
            unchangedFiles.push(relativePath);
          }
        } else {
          unchangedFiles.push(relativePath);
        }
      } catch (error) {
        console.error(`Error checking file ${filePath}: ${getErrorMessage(error)}`);
        skippedFiles.push(path.relative(this.rootDirectory, filePath));
      }
    }

    const result = `# File Change Detection Results

## Summary
- Total files checked: ${allFiles.length}
- New files: ${newFiles.length}
- Changed files (above threshold): ${changedFiles.length}
- Unchanged files: ${unchangedFiles.length}
- Skipped files (too large/error): ${skippedFiles.length}

## Change Threshold: ${changeThreshold}
## Max File Size: ${Math.round(maxFileSize / 1024)}KB

## New Files
${newFiles.length > 0 ? newFiles.map(f => `- ${f}`).join('\n') : 'None'}

## Changed Files (Need Summary Update)
${changedFiles.length > 0 ? changedFiles.map(f => `- ${f}`).join('\n') : 'None'}

## Skipped Files
${skippedFiles.length > 0 ? skippedFiles.map(f => `- ${f}`).join('\n') : 'None'}
`;

    return {
      llmContent: result,
      returnDisplay: result,
    };
  }

  /**
   * Automatically update summaries for files that have changed significantly
   */
  private async autoUpdateSummaries(
    params: FileSummarizationParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    // First check for changes
    const changeResult = await this.checkForChanges(params, signal);

    // Extract changed files from the change detection result
    const changeText = partListUnionToString(changeResult.llmContent);
    const changeLines = changeText.split('\n');
    const changedFilesSection = changeLines.findIndex((line: string) => line.includes('## Changed Files'));
    const skippedFilesSection = changeLines.findIndex((line: string) => line.includes('## Skipped Files'));

    const changedFiles: string[] = [];
    if (changedFilesSection !== -1) {
      const endSection = skippedFilesSection !== -1 ? skippedFilesSection : changeLines.length;
      for (let i = changedFilesSection + 1; i < endSection; i++) {
        const line = changeLines[i].trim();
        if (line.startsWith('- ')) {
          changedFiles.push(line.substring(2));
        }
      }
    }

    if (changedFiles.length === 0) {
      return {
        llmContent: 'No files need summary updates.',
        returnDisplay: 'No files need summary updates.',
      };
    }

    // Update summaries for changed files
    const updatedSummaries: string[] = [];
    const failedUpdates: string[] = [];

    for (const filePath of changedFiles) {
      try {
        const updateResult = await this.summarizeFiles({
          action: 'summarize',
          file_path: filePath,
          force_refresh: true,
        }, signal);

        const updateText = partListUnionToString(updateResult.llmContent);
        if (updateText.includes('New summaries generated: 1') ||
            updateText.includes('Summaries updated: 1')) {
          updatedSummaries.push(filePath);
        } else {
          failedUpdates.push(filePath);
        }
      } catch (error) {
        console.error(`Failed to update summary for ${filePath}: ${getErrorMessage(error)}`);
        failedUpdates.push(filePath);
      }
    }

    const result = `# Automatic Summary Update Results

## Summary
- Files checked for changes: ${changedFiles.length}
- Successfully updated: ${updatedSummaries.length}
- Failed updates: ${failedUpdates.length}

## Successfully Updated
${updatedSummaries.length > 0 ? updatedSummaries.map(f => `- ${f}`).join('\n') : 'None'}

## Failed Updates
${failedUpdates.length > 0 ? failedUpdates.map(f => `- ${f}`).join('\n') : 'None'}

${changeResult.llmContent}
`;

    return {
      llmContent: result,
      returnDisplay: result,
    };
  }

  /**
   * Calculate a change score between 0 and 1 based on file size and content differences
   */
  private calculateChangeScore(
    oldSize: number,
    newSize: number,
    oldHash: string,
    newHash: string
  ): number {
    // If hashes are the same, no change
    if (oldHash === newHash) {
      return 0;
    }

    // Calculate size change ratio
    const sizeChangeRatio = Math.abs(newSize - oldSize) / Math.max(oldSize, newSize, 1);

    // For now, use a simple heuristic: if hashes differ, assume significant change
    // In the future, this could be enhanced with more sophisticated diff analysis
    const hashChangeScore = 0.5; // Base score for any content change

    // Combine size change and hash change
    const combinedScore = Math.min(1, hashChangeScore + (sizeChangeRatio * 0.5));

    return combinedScore;
  }
}
