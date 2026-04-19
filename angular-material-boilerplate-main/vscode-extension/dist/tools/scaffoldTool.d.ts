import * as vscode from 'vscode';
interface ScaffoldInput {
    reactOutputPath: string;
    angularProjectPath?: string;
    conversionReportPath?: string;
}
export declare class ScaffoldTool implements vscode.LanguageModelTool<ScaffoldInput> {
    private readonly _workspaceRoot;
    constructor(_workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<ScaffoldInput>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ScaffoldInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
