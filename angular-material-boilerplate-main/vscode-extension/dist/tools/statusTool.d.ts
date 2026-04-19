import * as vscode from 'vscode';
interface StatusInput {
    angularProjectPath?: string;
}
export declare class StatusTool implements vscode.LanguageModelTool<StatusInput> {
    private readonly workspaceRoot;
    constructor(workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<StatusInput>, _token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(_options: vscode.LanguageModelToolInvocationPrepareOptions<StatusInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
