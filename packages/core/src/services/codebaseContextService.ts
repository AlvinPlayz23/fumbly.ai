/**
 * @license
 * Copyright 2025 Fumbly AI
 * SPDX-License-Identifier: Apache-2.0
 */

import { Config } from '../config/config.js';
import { CodebaseAnalysisTool } from '../tools/codebase-analysis.js';
import { FileSummarizationTool } from '../tools/file-summarization.js';
import { partListUnionToString } from '../core/geminiRequest.js';
import { getErrorMessage } from '../utils/errors.js';

export interface CodebaseContextOptions {
  includeArchitecture?: boolean;
  includeDependencies?: boolean;
  includeFileSummaries?: boolean;
  maxSummaries?: number;
  summaryThreshold?: number;
}

export interface CodebaseContext {
  architecture?: string;
  dependencies?: string;
  fileSummaries?: string;
  lastUpdated: string;
  fileCount: number;
  summaryCount: number;
}

/**
 * Service for integrating codebase analysis and file summaries into AI context
 */
export class CodebaseContextService {
  private codebaseAnalysisTool: CodebaseAnalysisTool;
  private fileSummarizationTool: FileSummarizationTool;
  private cachedContext: CodebaseContext | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(
    private config: Config,
    private rootDirectory: string
  ) {
    this.codebaseAnalysisTool = new CodebaseAnalysisTool(rootDirectory, config);
    this.fileSummarizationTool = new FileSummarizationTool(rootDirectory, config);
  }

  /**
   * Get comprehensive codebase context for AI
   */
  async getCodebaseContext(
    options: CodebaseContextOptions = {},
    signal?: AbortSignal
  ): Promise<CodebaseContext> {
    const {
      includeArchitecture = true,
      includeDependencies = true,
      includeFileSummaries = true,
      maxSummaries = 20,
      summaryThreshold = 0.3
    } = options;

    // Check cache first
    if (this.isCacheValid()) {
      return this.cachedContext!;
    }

    try {
      const context: CodebaseContext = {
        lastUpdated: new Date().toISOString(),
        fileCount: 0,
        summaryCount: 0,
      };

      const abortSignal = signal || new AbortController().signal;

      // Get architecture analysis
      if (includeArchitecture) {
        const archResult = await this.codebaseAnalysisTool.execute(
          { action: 'architecture' },
          abortSignal
        );
        context.architecture = partListUnionToString(archResult.llmContent);
      }

      // Get dependencies analysis
      if (includeDependencies) {
        const depsResult = await this.codebaseAnalysisTool.execute(
          { action: 'dependencies' },
          abortSignal
        );
        context.dependencies = partListUnionToString(depsResult.llmContent);
      }

      // Get file summaries
      if (includeFileSummaries) {
        // First check for changes
        const changeResult = await this.fileSummarizationTool.execute(
          { 
            action: 'check_changes',
            change_threshold: summaryThreshold,
            max_file_size: 1024 * 1024 // 1MB
          },
          abortSignal
        );

        // Get existing summaries
        const summariesResult = await this.fileSummarizationTool.execute(
          { action: 'list' },
          abortSignal
        );

        const summariesText = partListUnionToString(summariesResult.llmContent);
        
        // Limit summaries to prevent context overflow
        if (summariesText && summariesText !== 'No file summaries found.') {
          const lines = summariesText.split('\n');
          const summaryLines = lines.slice(0, Math.min(lines.length, maxSummaries * 10)); // Rough estimate
          context.fileSummaries = summaryLines.join('\n');
          
          // Count summaries
          const summaryMatches = summariesText.match(/## [^#]/g);
          context.summaryCount = summaryMatches ? summaryMatches.length : 0;
        }

        // Extract file count from change detection
        const changeText = partListUnionToString(changeResult.llmContent);
        const fileCountMatch = changeText.match(/Total files checked: (\d+)/);
        context.fileCount = fileCountMatch ? parseInt(fileCountMatch[1], 10) : 0;
      }

      // Cache the result
      this.cachedContext = context;
      this.lastCacheTime = Date.now();

      return context;
    } catch (error) {
      console.error('Error generating codebase context:', getErrorMessage(error));
      
      // Return minimal context on error
      return {
        lastUpdated: new Date().toISOString(),
        fileCount: 0,
        summaryCount: 0,
      };
    }
  }

  /**
   * Generate a formatted context string for AI system prompt
   */
  async getFormattedContext(
    options: CodebaseContextOptions = {},
    signal?: AbortSignal
  ): Promise<string> {
    const context = await this.getCodebaseContext(options, signal);
    
    let formattedContext = `# Codebase Context

*Last updated: ${context.lastUpdated}*
*Files analyzed: ${context.fileCount}, Summaries available: ${context.summaryCount}*

`;

    if (context.architecture) {
      formattedContext += `## Project Architecture\n${context.architecture}\n\n`;
    }

    if (context.dependencies) {
      formattedContext += `## Dependencies\n${context.dependencies}\n\n`;
    }

    if (context.fileSummaries) {
      formattedContext += `## File Summaries\n${context.fileSummaries}\n\n`;
    }

    formattedContext += `---

*This codebase context is automatically generated and updated. Use this information to provide more accurate and project-specific assistance.*`;

    return formattedContext;
  }

  /**
   * Force refresh of cached context
   */
  async refreshContext(
    options: CodebaseContextOptions = {},
    signal?: AbortSignal
  ): Promise<CodebaseContext> {
    this.invalidateCache();
    return this.getCodebaseContext(options, signal);
  }

  /**
   * Check if cached context is still valid
   */
  private isCacheValid(): boolean {
    return this.cachedContext !== null && 
           (Date.now() - this.lastCacheTime) < this.CACHE_DURATION;
  }

  /**
   * Invalidate cached context
   */
  private invalidateCache(): void {
    this.cachedContext = null;
    this.lastCacheTime = 0;
  }

  /**
   * Get cache status information
   */
  getCacheStatus(): { cached: boolean; age: number; expires: number } {
    const age = Date.now() - this.lastCacheTime;
    const expires = this.CACHE_DURATION - age;
    
    return {
      cached: this.isCacheValid(),
      age,
      expires: Math.max(0, expires)
    };
  }
}
