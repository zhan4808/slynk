# Contributing to Slynk AI

Thank you for your interest in contributing to Slynk AI! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug in the application:

1. Check if the bug has already been reported in the Issues tab
2. If not, create a new issue with:
   - A clear title and description
   - Steps to reproduce the bug
   - Expected and actual behavior
   - Screenshots if applicable
   - Environment details (browser, OS, etc.)

### Suggesting Features

Feature suggestions are welcome:

1. Check if the feature has already been suggested in the Issues tab
2. If not, create a new issue with:
   - A clear title and description
   - The problem the feature would solve
   - Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Make your changes
4. Ensure your code passes linting and tests
5. Submit a pull request with a clear description of the changes

## Development Environment Setup

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Copy `.env.example` to `.env.local` and configure environment variables
4. Run the development server with `pnpm dev`

## Coding Conventions

### Code Style

- Use TypeScript for all new code
- Follow the existing code style in the project
- Use functional components with hooks for React code
- Use descriptive variable and function names

### Component Organization

- Keep components focused on a single responsibility
- Extract reusable logic to custom hooks
- Group related functionality in the same directory

### Commits

- Use clear, descriptive commit messages
- Reference issue numbers in commit messages when applicable
- Keep commits focused on a single change

## Testing

- Add tests for new functionality
- Ensure existing tests pass before submitting a PR
- Test your changes in different browsers if they involve UI

## Documentation

- Update documentation to reflect your changes
- Add JSDoc comments to functions and components
- Create or update README files for new or modified features

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.

## Questions?

If you have any questions about contributing, please reach out to the project maintainers. 