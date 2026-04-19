import * as vscode from 'vscode';
interface ConvertInput {
    angularProjectPath: string;
    reactProjectPath: string;
    componentName?: string;
    includeTests?: boolean;
    /** Convert additional Angular artifacts beyond components */
    patterns?: Array<'components' | 'services' | 'http' | 'pipes' | 'directives' | 'guards' | 'state' | 'forms-advanced' | 'all'>;
}
export declare class ConvertTool implements vscode.LanguageModelTool<ConvertInput> {
    private readonly _workspaceRoot;
    constructor(_workspaceRoot: string);
    invoke(options: vscode.LanguageModelToolInvocationOptions<ConvertInput>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;
    prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ConvertInput>, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.PreparedToolInvocation>;
}
export {};
