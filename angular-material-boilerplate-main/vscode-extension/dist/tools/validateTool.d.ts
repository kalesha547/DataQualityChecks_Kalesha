import * as vscode from 'vscode';
interface ValidateInput {
    reactProjectPath: string;
    steps?: Array<'typecheck' | 'test' | 'build'>;
}
export declare class ValidateTool implements vscode.LanguageModelTool<ValidateInput> {
    private readonly _workspaceRoot;
    constructor(_workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<ValidateInput>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ValidateInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
