# PCL Expert — Best Practices

Reference material for the `pcl-expert` skill. See [SKILL.md](../SKILL.md).

## Best Practices

### Compiler Development

1. **Immutable AST**: Never mutate AST nodes; return new nodes
2. **Position Tracking**: Always include source positions for error messages
3. **Error Recovery**: Continue parsing/analysis after errors
4. **Two-Pass Analysis**: Separate declaration and validation phases
5. **Type Safety**: Use discriminated unions and branded types
6. **Testing**: 80%+ code coverage, especially for critical paths

### Runtime Design

1. **Lazy Evaluation**: Don't execute until needed
2. **Memory Safety**: No leaks, proper cleanup
3. **Async/Await**: Use promises for all I/O operations
4. **Error Handling**: Return Result types, don't throw
5. **Provider Abstraction**: Support multiple AI providers
6. **Observability**: Instrument all critical paths

### Language Design

1. **Simplicity**: Keep syntax minimal and intuitive
2. **Consistency**: Follow established patterns
3. **Extensibility**: Design for future enhancements
4. **Documentation**: Comprehensive specs and examples
5. **Backward Compatibility**: Deprecate gracefully
6. **Standards Compliance**: Align with industry standards

### Testing Strategy

```typescript
// Unit tests for each compiler phase
describe('Lexer', () => {
  it('tokenizes persona declaration', () => {
    const source = 'persona ARCHI { }';
    const tokens = lexer.scan(source);
    expect(tokens[0].type).toBe('KEYWORD');
  });
});

// Integration tests for full pipeline
describe('Compiler', () => {
  it('compiles valid PCL to JavaScript', () => {
    const source = readFile('examples/persona.pcl');
    const result = compile(source);
    expect(result.ok).toBe(true);
  });
});

// End-to-end tests for runtime
describe('Runtime', () => {
  it('executes persona with OpenAI provider', async () => {
    const persona = loadPersona('ARCHI');
    const response = await runtime.execute(persona, 'Design a REST API');
    expect(response.content).toBeDefined();
  });
});
```
