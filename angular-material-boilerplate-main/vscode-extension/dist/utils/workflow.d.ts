/**
 * Shared utilities for the migration workflow tools.
 * Handles checkpoint reading/writing, shell execution,
 * and structured result formatting.
 */
import * as vscode from 'vscode';
export interface AgentInfo {
    id: number;
    name: string;
    checkpoint: string;
    done: boolean;
}
export interface ShellResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}
export interface ValidationResult {
    step: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    output: string;
    errors: string[];
}
export declare const AGENTS: Omit<AgentInfo, 'done'>[];
/**
 * Derive the list of Angular component class names from a conversion report.
 * Falls back to scanning .component.ts files directly if no report is available.
 */
export declare function getAngularComponents(reportOrProjectPath: Record<string, unknown> | string): string[];
/** @deprecated Use getAngularComponents() — this static list is project-specific */
export declare const ANGULAR_COMPONENTS: string[];
export declare function checkpointDir(angularProjectPath: string): string;
export declare function outputDir(angularProjectPath: string): string;
export declare function getAgentStatus(angularProjectPath: string): AgentInfo[];
export declare function writeCheckpoint(angularProjectPath: string, checkpoint: string): void;
export declare function readConversionReport(angularProjectPath: string): object | null;
export declare function runShell(command: string, cwd: string, token?: vscode.CancellationToken): Promise<ShellResult>;
export declare function makeResult(text: string): vscode.LanguageModelToolResult;
export declare function formatAgentTable(agents: AgentInfo[]): string;
export declare function formatValidationResults(results: ValidationResult[]): string;
export declare function findAngularComponents(srcPath: string): string[];
export declare function getPackageVersion(projectPath: string, pkg: string): string | null;
