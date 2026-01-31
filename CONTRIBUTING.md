# Contributing to AutoML Discovery Pipeline

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/AutoML.git
   cd AutoML
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Build and run**
   ```bash
   npm run build
   npm run dev
   ```

## Project Structure

```
src/
├── index.ts              # Application entry point
├── config.ts             # Environment configuration
├── db/
│   ├── mongodb.ts        # MongoDB connection manager
│   └── schemas.ts        # TypeScript type definitions
├── services/
│   ├── openrouter.ts     # OpenRouter API client
│   └── firecrawl.ts      # Firecrawl API client
├── jobs/
│   ├── agenda.ts         # Job queue initialization
│   ├── intent-parser.job.ts
│   ├── discovery-crawl.job.ts
│   ├── relevance-scorer.job.ts
│   └── validation-enrich.job.ts
├── api/
│   └── discovery.ts      # REST API endpoints
└── webhooks/
    └── firecrawl.ts      # Webhook handlers
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define interfaces for all data structures
- Avoid `any` types when possible
- Use `async/await` instead of callbacks

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Maximum line length: 100 characters
- Use trailing commas in arrays/objects

### Comments

- Add JSDoc comments for functions
- Explain **why**, not **what**
- Use `TODO:` for future improvements
- Use `FIXME:` for known issues

Example:
```typescript
/**
 * Parse user intent to extract target variable and search queries
 * @param userPrompt - Natural language description of data needs
 * @returns Structured intent with target, features, and queries
 */
async parseIntent(userPrompt: string): Promise<ParsedIntent> {
  // ...
}
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards above
- Add comments where necessary
- Update types/interfaces if needed

### 3. Test Your Changes

```bash
# Build to check for TypeScript errors
npm run build

# Test locally
npm run dev

# Make test requests
curl -X POST http://localhost:3000/discovery/start \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test prompt"}'
```

### 4. Commit Your Changes

Write clear commit messages:

```bash
git add .
git commit -m "feat: add caching for Firecrawl search results"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test additions/changes
- `chore:` - Build/tooling changes

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Description of what changed and why
- Any testing steps
- Screenshots/examples if applicable

## Areas for Contribution

### High Priority

- [ ] Add unit tests (Jest)
- [ ] Add integration tests
- [ ] Implement authentication/API keys
- [ ] Add rate limiting middleware
- [ ] Error handling improvements
- [ ] Logging improvements (structured logs)

### Features

- [ ] Support for more data sources (APIs, databases)
- [ ] Custom search strategies
- [ ] Data quality scoring improvements
- [ ] Source deduplication across projects
- [ ] Export discovered sources (CSV, JSON)
- [ ] Web UI for discovery management
- [ ] Batch discovery processing
- [ ] Scheduled discovery runs

### Documentation

- [ ] API reference documentation
- [ ] Architecture diagrams
- [ ] Video tutorials
- [ ] More example use cases
- [ ] Performance tuning guide

### DevOps

- [ ] Docker support
- [ ] Kubernetes manifests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing in CI
- [ ] Code coverage reporting

## Code Review Process

All contributions require review. Reviewers will check:

1. **Functionality**: Does it work as intended?
2. **Code Quality**: Is it clean, readable, maintainable?
3. **Standards**: Does it follow project conventions?
4. **Tests**: Are there tests? Do they pass?
5. **Documentation**: Is it documented?

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Tag maintainers for urgent matters

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
