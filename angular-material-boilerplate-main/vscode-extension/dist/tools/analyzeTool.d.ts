import * as vscode from 'vscode';
interface AnalyzeInput {
    angularProjectPath: string;
    outputPath?: string;
}
export declare class AnalyzeTool implements vscode.LanguageModelTool<AnalyzeInput> {
    private readonly _workspaceRoot;
    constructor(_workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<AnalyzeInput>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<AnalyzeInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
