import * as vscode from 'vscode';
interface PipelineInput {
    angularProjectPath: string;
    reactOutputPath: string;
    fromAgent?: number;
    dryRun?: boolean;
}
export declare class PipelineTool implements vscode.LanguageModelTool<PipelineInput> {
    private readonly _workspaceRoot;
    constructor(_workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<PipelineInput>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<PipelineInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
