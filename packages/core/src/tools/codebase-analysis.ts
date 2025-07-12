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

interface CodebaseAnalysisParams {
  action: 'analyze' | 'summary' | 'dependencies' | 'architecture';
  target_path?: string;
  include_summaries?: boolean;
  force_refresh?: boolean;
}

interface ProjectDependencies {
  packageJson?: any;
  requirements?: string[];
  cargoToml?: any;
  buildGradle?: string;
  gemfile?: string;
  goMod?: string;
}



interface ProjectArchitecture {
  projectType: string;
  framework?: string;
  language: string[];
  structure: {
    directories: string[];
    mainFiles: string[];
    configFiles: string[];
    testFiles: string[];
    buildFiles: string[];
    docFiles: string[];
  };
  dependencies: ProjectDependencies;
  patterns: string[];
  frameworks: FrameworkInfo[];
  buildSystems: string[];
  architecturalPatterns: string[];
  technologies: string[];
}

interface FrameworkInfo {
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' | 'testing' | 'build' | 'other';
  confidence: number; // 0-1 confidence score
  evidence: string[]; // Files/patterns that indicate this framework
}

/**
 * Tool for comprehensive codebase analysis and understanding
 */
export class CodebaseAnalysisTool extends BaseTool<CodebaseAnalysisParams, ToolResult> {
  static readonly Name: string = 'codebase_analysis';

  constructor(
    private rootDirectory: string,
    private config: Config,
  ) {
    super(
      CodebaseAnalysisTool.Name,
      'Codebase Analysis',
      'Analyzes project structure, dependencies, architecture patterns, and generates intelligent summaries of the codebase',
      {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            enum: ['analyze', 'summary', 'dependencies', 'architecture'],
            description: 'Type of analysis to perform: analyze (full analysis), summary (file summaries), dependencies (dependency analysis), architecture (project structure)',
          },
          target_path: {
            type: Type.STRING,
            description: 'Optional: Specific path to analyze (relative to project root). If not provided, analyzes entire project.',
          },
          include_summaries: {
            type: Type.BOOLEAN,
            description: 'Whether to include file summaries in the analysis (default: true)',
          },
          force_refresh: {
            type: Type.BOOLEAN,
            description: 'Force refresh of cached analysis data (default: false)',
          },
        },
        required: ['action'],
      },
    );
  }

  async execute(params: CodebaseAnalysisParams, signal: AbortSignal): Promise<ToolResult> {
    try {
      const targetPath = params.target_path 
        ? path.resolve(this.rootDirectory, params.target_path)
        : this.rootDirectory;

      switch (params.action) {
        case 'analyze':
          return await this.performFullAnalysis(targetPath, params, signal);
        case 'summary':
          return await this.generateFileSummaries(targetPath, params, signal);
        case 'dependencies':
          return await this.analyzeDependencies(targetPath, signal);
        case 'architecture':
          return await this.analyzeArchitecture(targetPath, signal);
        default:
          return {
            llmContent: `Unknown action: ${params.action}`,
            returnDisplay: `Error: Unknown analysis action "${params.action}"`,
          };
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error during codebase analysis: ${errorMessage}`,
        returnDisplay: `Analysis failed: ${errorMessage}`,
      };
    }
  }

  private async performFullAnalysis(
    targetPath: string,
    params: CodebaseAnalysisParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    const results: {
      architecture: ToolResult;
      dependencies: ToolResult;
      summaries?: ToolResult;
    } = {
      architecture: await this.analyzeArchitecture(targetPath, signal),
      dependencies: await this.analyzeDependencies(targetPath, signal),
    };

    if (params.include_summaries !== false) {
      results.summaries = await this.generateFileSummaries(targetPath, params, signal);
    }

    const analysis = `# Comprehensive Codebase Analysis

## Project Architecture
${results.architecture.llmContent}

## Dependencies Analysis
${results.dependencies.llmContent}

${results.summaries ? `## File Summaries\n${results.summaries.llmContent}` : ''}
`;

    return {
      llmContent: analysis,
      returnDisplay: analysis,
    };
  }

  private async generateFileSummaries(
    targetPath: string,
    params: CodebaseAnalysisParams,
    signal: AbortSignal
  ): Promise<ToolResult> {
    try {
      // Get the file summarization tool
      const toolRegistry = await this.config.getToolRegistry();
      const fileSummarizationTool = toolRegistry.getTool('file_summarization');

      if (!fileSummarizationTool) {
        return {
          llmContent: 'File summarization tool not available',
          returnDisplay: 'File summarization tool not available',
        };
      }

      // Generate summaries for the target path
      const relativePath = path.relative(this.rootDirectory, targetPath);
      const result = await fileSummarizationTool.execute({
        action: 'summarize',
        target_path: relativePath || undefined,
        force_refresh: params.force_refresh || false,
      }, signal);

      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error generating file summaries: ${errorMessage}`,
        returnDisplay: `File summary generation failed: ${errorMessage}`,
      };
    }
  }

  private async analyzeDependencies(targetPath: string, _signal: AbortSignal): Promise<ToolResult> {
    const dependencies: ProjectDependencies = {};
    
    try {
      // Check for package.json (Node.js/JavaScript)
      const packageJsonPath = path.join(targetPath, 'package.json');
      try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
        dependencies.packageJson = JSON.parse(packageJsonContent);
      } catch {}

      // Check for requirements.txt (Python)
      const requirementsPath = path.join(targetPath, 'requirements.txt');
      try {
        const requirementsContent = await fs.readFile(requirementsPath, 'utf-8');
        dependencies.requirements = requirementsContent.split('\n').filter(line => line.trim());
      } catch {}

      // Check for Cargo.toml (Rust)
      const cargoPath = path.join(targetPath, 'Cargo.toml');
      try {
        const cargoContent = await fs.readFile(cargoPath, 'utf-8');
        // Simple TOML parsing for dependencies section
        dependencies.cargoToml = { content: cargoContent };
      } catch {}

      // Check for build.gradle (Java/Kotlin)
      const gradlePath = path.join(targetPath, 'build.gradle');
      try {
        dependencies.buildGradle = await fs.readFile(gradlePath, 'utf-8');
      } catch {}

      // Check for Gemfile (Ruby)
      const gemfilePath = path.join(targetPath, 'Gemfile');
      try {
        dependencies.gemfile = await fs.readFile(gemfilePath, 'utf-8');
      } catch {}

      // Check for go.mod (Go)
      const goModPath = path.join(targetPath, 'go.mod');
      try {
        dependencies.goMod = await fs.readFile(goModPath, 'utf-8');
      } catch {}

      const analysis = this.formatDependencyAnalysis(dependencies);
      
      return {
        llmContent: analysis,
        returnDisplay: analysis,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error analyzing dependencies: ${errorMessage}`,
        returnDisplay: `Dependency analysis failed: ${errorMessage}`,
      };
    }
  }

  private async analyzeArchitecture(targetPath: string, signal: AbortSignal): Promise<ToolResult> {
    try {
      const architecture: ProjectArchitecture = {
        projectType: 'unknown',
        language: [],
        structure: {
          directories: [],
          mainFiles: [],
          configFiles: [],
          testFiles: [],
          buildFiles: [],
          docFiles: [],
        },
        dependencies: {},
        patterns: [],
        frameworks: [],
        buildSystems: [],
        architecturalPatterns: [],
        technologies: [],
      };

      // Get directory structure
      const entries = await glob('**/*', {
        cwd: targetPath,
        withFileTypes: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        signal,
      });

      // Analyze file patterns and structure
      for (const entry of entries) {
        if (entry.isDirectory()) {
          architecture.structure.directories.push(entry.name);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          const basename = path.basename(entry.name).toLowerCase();
          const fullPath = entry.name;

          // Detect languages with more comprehensive coverage
          this.detectLanguages(ext, basename, architecture);

          // Categorize files with enhanced detection
          this.categorizeFile(basename, fullPath, ext, architecture);

          // Detect frameworks and technologies
          this.detectFrameworksAndTechnologies(basename, fullPath, ext, architecture);
        }
      }

      // Enhanced analysis
      architecture.projectType = this.detectProjectType(architecture);
      architecture.framework = this.detectPrimaryFramework(architecture);
      architecture.patterns = this.detectPatterns(architecture);
      architecture.buildSystems = this.detectBuildSystems(architecture);
      architecture.architecturalPatterns = this.detectArchitecturalPatterns(architecture);
      architecture.technologies = this.extractTechnologies(architecture);

      const analysis = this.formatArchitectureAnalysis(architecture);
      
      return {
        llmContent: analysis,
        returnDisplay: analysis,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        llmContent: `Error analyzing architecture: ${errorMessage}`,
        returnDisplay: `Architecture analysis failed: ${errorMessage}`,
      };
    }
  }

  private detectProjectType(architecture: ProjectArchitecture): string {
    if (architecture.structure.configFiles.includes('package.json')) {
      return 'Node.js/JavaScript';
    } else if (architecture.structure.configFiles.includes('requirements.txt')) {
      return 'Python';
    } else if (architecture.structure.configFiles.includes('Cargo.toml')) {
      return 'Rust';
    } else if (architecture.structure.configFiles.includes('build.gradle')) {
      return 'Java/Kotlin';
    }
    return 'Mixed/Unknown';
  }



  private detectPatterns(architecture: ProjectArchitecture): string[] {
    const patterns: string[] = [];
    
    if (architecture.structure.directories.includes('src')) {
      patterns.push('Source directory structure');
    }
    if (architecture.structure.testFiles.length > 0) {
      patterns.push('Test-driven development');
    }
    if (architecture.structure.directories.includes('docs')) {
      patterns.push('Documentation-focused');
    }
    
    return patterns;
  }

  private formatDependencyAnalysis(dependencies: ProjectDependencies): string {
    let analysis = '# Dependency Analysis\n\n';
    
    if (dependencies.packageJson) {
      analysis += '## Node.js Dependencies\n';
      const pkg = dependencies.packageJson;
      if (pkg.dependencies) {
        analysis += '### Production Dependencies:\n';
        Object.entries(pkg.dependencies).forEach(([name, version]) => {
          analysis += `- ${name}: ${version}\n`;
        });
      }
      if (pkg.devDependencies) {
        analysis += '### Development Dependencies:\n';
        Object.entries(pkg.devDependencies).forEach(([name, version]) => {
          analysis += `- ${name}: ${version}\n`;
        });
      }
      analysis += '\n';
    }

    if (dependencies.requirements) {
      analysis += '## Python Dependencies\n';
      dependencies.requirements.forEach(req => {
        if (req.trim()) analysis += `- ${req}\n`;
      });
      analysis += '\n';
    }

    // Add other dependency types...

    return analysis;
  }

  private detectLanguages(ext: string, basename: string, architecture: ProjectArchitecture): void {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript/React',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript/React',
      '.py': 'Python',
      '.rs': 'Rust',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.go': 'Go',
      '.rb': 'Ruby',
      '.php': 'PHP',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.c': 'C',
      '.swift': 'Swift',
      '.dart': 'Dart',
      '.scala': 'Scala',
      '.clj': 'Clojure',
      '.hs': 'Haskell',
      '.elm': 'Elm',
      '.vue': 'Vue.js',
      '.svelte': 'Svelte',
    };

    const language = languageMap[ext];
    if (language && !architecture.language.includes(language)) {
      architecture.language.push(language);
    }

    // Special cases based on filename
    if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) {
      if (!architecture.technologies.includes('Docker')) {
        architecture.technologies.push('Docker');
      }
    }
  }

  private categorizeFile(basename: string, fullPath: string, _ext: string, architecture: ProjectArchitecture): void {
    // Configuration files
    const configFiles = [
      'package.json', 'cargo.toml', 'requirements.txt', 'build.gradle', 'pom.xml',
      'composer.json', 'gemfile', 'go.mod', 'setup.py', 'pyproject.toml',
      'tsconfig.json', 'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      '.eslintrc', '.prettierrc', 'babel.config.js', 'jest.config.js',
      'docker-compose.yml', 'dockerfile', '.gitignore', '.env'
    ];

    // Build files
    const buildFiles = [
      'makefile', 'cmake', 'build.gradle', 'pom.xml', 'webpack.config.js',
      'vite.config.js', 'rollup.config.js', 'gulpfile.js', 'gruntfile.js'
    ];

    // Documentation files
    const docFiles = [
      'readme.md', 'changelog.md', 'contributing.md', 'license', 'docs'
    ];

    // Main entry points
    const mainFiles = [
      'index.js', 'index.ts', 'main.py', 'main.rs', 'app.js', 'app.py',
      'server.js', 'server.py', 'main.go', 'main.java'
    ];

    if (configFiles.some(cf => basename.includes(cf.toLowerCase()))) {
      architecture.structure.configFiles.push(fullPath);
    }

    if (buildFiles.some(bf => basename.includes(bf.toLowerCase()))) {
      architecture.structure.buildFiles.push(fullPath);
    }

    if (docFiles.some(df => basename.includes(df.toLowerCase()))) {
      architecture.structure.docFiles.push(fullPath);
    }

    if (mainFiles.includes(basename)) {
      architecture.structure.mainFiles.push(fullPath);
    }

    // Test files - enhanced detection
    if (fullPath.includes('test') || fullPath.includes('spec') ||
        fullPath.includes('__tests__') || basename.endsWith('.test.js') ||
        basename.endsWith('.spec.js') || basename.endsWith('.test.ts') ||
        basename.endsWith('.spec.ts')) {
      architecture.structure.testFiles.push(fullPath);
    }
  }

  private detectFrameworksAndTechnologies(basename: string, fullPath: string, ext: string, architecture: ProjectArchitecture): void {
    const frameworks: FrameworkInfo[] = [];

    // React detection
    if (ext === '.jsx' || ext === '.tsx' || basename.includes('react')) {
      frameworks.push({
        name: 'React',
        type: 'frontend',
        confidence: 0.9,
        evidence: [`${ext} files found`]
      });
    }

    // Vue.js detection
    if (ext === '.vue' || basename.includes('vue')) {
      frameworks.push({
        name: 'Vue.js',
        type: 'frontend',
        confidence: 0.9,
        evidence: [`${ext} files found`]
      });
    }

    // Angular detection
    if (basename.includes('angular') || fullPath.includes('angular.json')) {
      frameworks.push({
        name: 'Angular',
        type: 'frontend',
        confidence: 0.8,
        evidence: ['Angular configuration found']
      });
    }

    // Next.js detection
    if (basename === 'next.config.js' || fullPath.includes('pages/') || fullPath.includes('app/')) {
      frameworks.push({
        name: 'Next.js',
        type: 'fullstack',
        confidence: 0.8,
        evidence: ['Next.js structure detected']
      });
    }

    // Express.js detection
    if (basename.includes('express') || fullPath.includes('routes/')) {
      frameworks.push({
        name: 'Express.js',
        type: 'backend',
        confidence: 0.7,
        evidence: ['Express patterns found']
      });
    }

    // Django detection
    if (basename === 'manage.py' || basename === 'settings.py' || fullPath.includes('django')) {
      frameworks.push({
        name: 'Django',
        type: 'backend',
        confidence: 0.9,
        evidence: ['Django files found']
      });
    }

    // Flask detection
    if (basename.includes('flask') || fullPath.includes('app.py')) {
      frameworks.push({
        name: 'Flask',
        type: 'backend',
        confidence: 0.7,
        evidence: ['Flask patterns found']
      });
    }

    // Add detected frameworks
    frameworks.forEach(framework => {
      const existing = architecture.frameworks.find(f => f.name === framework.name);
      if (!existing) {
        architecture.frameworks.push(framework);
      } else {
        existing.confidence = Math.max(existing.confidence, framework.confidence);
        existing.evidence.push(...framework.evidence);
      }
    });
  }

  private detectBuildSystems(architecture: ProjectArchitecture): string[] {
    const buildSystems: string[] = [];
    const configFiles = architecture.structure.configFiles.map(f => path.basename(f).toLowerCase());

    if (configFiles.includes('package.json')) buildSystems.push('npm/yarn');
    if (configFiles.includes('cargo.toml')) buildSystems.push('Cargo');
    if (configFiles.includes('build.gradle')) buildSystems.push('Gradle');
    if (configFiles.includes('pom.xml')) buildSystems.push('Maven');
    if (configFiles.includes('makefile')) buildSystems.push('Make');
    if (configFiles.includes('cmake')) buildSystems.push('CMake');
    if (configFiles.includes('setup.py')) buildSystems.push('setuptools');
    if (configFiles.includes('pyproject.toml')) buildSystems.push('Poetry/pip');

    return buildSystems;
  }

  private detectArchitecturalPatterns(architecture: ProjectArchitecture): string[] {
    const patterns: string[] = [];
    const dirs = architecture.structure.directories;

    // MVC pattern
    if (dirs.includes('models') && dirs.includes('views') && dirs.includes('controllers')) {
      patterns.push('Model-View-Controller (MVC)');
    }

    // Microservices
    if (dirs.includes('services') || dirs.filter(d => d.includes('service')).length > 2) {
      patterns.push('Microservices Architecture');
    }

    // Layered architecture
    if (dirs.includes('domain') && dirs.includes('infrastructure') && dirs.includes('application')) {
      patterns.push('Clean Architecture');
    }

    // Component-based
    if (dirs.includes('components') || dirs.includes('widgets')) {
      patterns.push('Component-Based Architecture');
    }

    // API-first
    if (dirs.includes('api') || dirs.includes('routes') || dirs.includes('endpoints')) {
      patterns.push('API-First Design');
    }

    return patterns;
  }

  private extractTechnologies(architecture: ProjectArchitecture): string[] {
    const technologies: string[] = [];

    // Add technologies from frameworks
    architecture.frameworks.forEach(framework => {
      if (!technologies.includes(framework.name)) {
        technologies.push(framework.name);
      }
    });

    // Add build systems as technologies
    architecture.buildSystems.forEach(buildSystem => {
      if (!technologies.includes(buildSystem)) {
        technologies.push(buildSystem);
      }
    });

    return technologies;
  }

  private detectPrimaryFramework(architecture: ProjectArchitecture): string | undefined {
    if (architecture.frameworks.length === 0) return undefined;

    // Return the framework with highest confidence
    const primary = architecture.frameworks.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );

    return primary.name;
  }

  private formatArchitectureAnalysis(architecture: ProjectArchitecture): string {
    return `# Enhanced Project Architecture Analysis

## Project Type: ${architecture.projectType}
${architecture.framework ? `## Primary Framework: ${architecture.framework}` : ''}

## Languages: ${architecture.language.join(', ')}

## Detected Frameworks:
${architecture.frameworks.length > 0 ?
  architecture.frameworks.map(f => `- ${f.name} (${f.type}, confidence: ${Math.round(f.confidence * 100)}%)`).join('\n') :
  'None detected'}

## Build Systems: ${architecture.buildSystems.join(', ') || 'None detected'}

## Technologies: ${architecture.technologies.join(', ') || 'None detected'}

## Directory Structure:
${architecture.structure.directories.slice(0, 20).map(dir => `- ${dir}`).join('\n')}

## Key Files:
### Configuration Files:
${architecture.structure.configFiles.slice(0, 10).map(file => `- ${file}`).join('\n')}

### Main Entry Points:
${architecture.structure.mainFiles.map(file => `- ${file}`).join('\n')}

### Build Files:
${architecture.structure.buildFiles.slice(0, 5).map(file => `- ${file}`).join('\n')}

### Test Files:
${architecture.structure.testFiles.slice(0, 10).map(file => `- ${file}`).join('\n')}

## Architectural Patterns:
${architecture.architecturalPatterns.length > 0 ?
  architecture.architecturalPatterns.map(pattern => `- ${pattern}`).join('\n') :
  'None detected'}

## Development Patterns:
${architecture.patterns.map(pattern => `- ${pattern}`).join('\n')}
`;
  }
}
