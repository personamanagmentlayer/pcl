
describe('Import test', () => {
  it('should import without error', async () => {
    const { CodeActionProvider } = await import('../../src/lsp/code-actions.js');
    expect(CodeActionProvider).toBeDefined();
    const provider = new CodeActionProvider();
    expect(provider).toBeDefined();
  });
});
