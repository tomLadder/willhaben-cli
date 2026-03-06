# Contributing to willhaben-cli

First off, thanks for taking the time to contribute!

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (command used, JSON templates, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment** (OS, Bun version, willhaben-cli version)

### Suggesting Features

Feature suggestions are welcome! Please:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested feature**
- **Explain why this feature would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code passes type checking (`bun run typecheck`)
4. Make sure your code follows the existing style
5. Write a clear PR description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/willhaben-cli.git
cd willhaben-cli

# Install dependencies
bun install

# Run in development mode
bun run dev -- --help

# Type check
bun run typecheck

# Build
bun run build
```

## Project Structure

```
src/
├── index.ts           # CLI entry point
├── api/               # API client and endpoints
├── cli/commands/      # Command implementations
├── store/             # Configuration and caching
└── types/             # TypeScript interfaces
```

## Style Guide

- Use TypeScript strict mode
- Use meaningful variable and function names
- Keep functions focused and small
- Add types for all API responses
- Use async/await over raw promises
- Handle errors gracefully with user-friendly messages

## API Discovery

The willhaben API is not officially documented. If you discover new endpoints:

1. Use [mitmproxy](https://mitmproxy.org/) to capture traffic from the mobile app
2. Document the endpoint structure and parameters
3. Add appropriate types
4. Implement the functionality

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Keep the first line under 72 characters
- Reference issues and pull requests when relevant

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing!
