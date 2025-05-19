# Contributing to Warp Terminal Clone

First off, thank you for considering contributing to Warp Terminal Clone! It's people like you that make this project such a great tool for everyone. This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating.

## Getting Started

### Development Environment Setup

1. **Prerequisites**:
   - Rust toolchain (rustc, cargo) 1.70 or newer
   - Development libraries:
     - On Ubuntu/Debian: `apt install libx11-dev libxcb-shape0-dev libxcb-xfixes0-dev`
     - On Fedora/RHEL: `dnf install libX11-devel libxcb-devel`
     - On macOS: `brew install pkg-config`

2. **Fork & Clone**:
   - Fork the repository on GitHub
   - Clone your fork locally:
     ```bash
     git clone https://github.com/yourusername/warp-terminal-clone.git
     cd warp-terminal-clone
     ```

3. **Set up the development environment**:
   ```bash
   cargo check     # Verify everything is set up correctly
   cargo test      # Run tests to ensure they pass
   cargo run -- --debug  # Run in development mode
   ```

### Understanding the Project Structure

```
src/
├── ai/          # AI assistance components
├── terminal/    # Terminal emulation core
├── ui/          # User interface components
├── config/      # Configuration handling
├── commands/    # Command implementation
└── main.rs      # Application entry point
```

Take some time to familiarize yourself with the codebase before making significant changes.

## Contribution Process

### 1. Finding Something to Work On

- Look at the [open issues](https://github.com/yourusername/warp-terminal-clone/issues), especially those marked "good first issue" or "help wanted"
- Check the "In Development" section of the README.md for features that need implementation
- Feel free to propose new features or improvements by opening an issue for discussion

### 2. Making Changes

1. **Create a branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```

2. **Make your changes**:
   - Write clean, well-commented code
   - Follow the code style guidelines (see below)
   - Add or update tests as necessary
   - Add or update documentation as necessary

3. **Commit your changes**:
   - Use clear and meaningful commit messages
   - Reference issue numbers if applicable
   ```bash
   git commit -m "Add feature X which implements #123"
   ```

4. **Stay up to date** with the main repository:
   ```bash
   git remote add upstream https://github.com/original-owner/warp-terminal-clone.git
   git fetch upstream
   git rebase upstream/main
   ```

5. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

### 3. Submitting a Pull Request

1. Go to your fork on GitHub and click the "New pull request" button
2. Ensure the base repository is set to the original project and the base branch is `main`
3. Provide a clear title and description for your PR
4. Link any relevant issues in the description using keywords like "Fixes #123" or "Relates to #456"

## Code Style and Standards

We follow the standard Rust coding conventions:

1. **Formatting**:
   - Always run `cargo fmt` before committing
   - This ensures consistent formatting across the codebase

2. **Linting**:
   - Run `cargo clippy` to catch common mistakes and inefficient code
   - Fix any clippy warnings before submitting a PR

3. **Naming Conventions**:
   - Use snake_case for variables and function names
   - Use PascalCase for types, traits, and enum variants
   - Use SCREAMING_SNAKE_CASE for constants

4. **Documentation**:
   - Document public APIs with doc comments (`///`)
   - Include examples in documentation where appropriate
   - For complex functionality, explain the why, not just the what

## Testing Requirements

All code contributions should include appropriate tests:

1. **Unit Tests**:
   - Add unit tests for new functions or modules
   - Tests should be placed in a `tests` module or in separate test files

2. **Integration Tests**:
   - For features that affect multiple components, add integration tests
   - Tests should cover both happy paths and error conditions

3. **Running Tests**:
   ```bash
   # Run all tests
   cargo test
   
   # Run specific tests
   cargo test test_name
   
   # Run tests with output
   cargo test -- --nocapture
   ```

4. **Test Coverage**:
   - Aim for high test coverage in critical code paths
   - Consider edge cases and error conditions

## Pull Request Process

1. **Initial Review**:
   - Maintainers will review your PR as soon as possible
   - Be prepared to make changes based on feedback

2. **CI Checks**:
   - PRs must pass all automated checks:
     - Build success
     - Test passing
     - Code style checks

3. **Review Process**:
   - Address all review comments
   - Make requested changes and push them to your branch
   - Discussion may continue until the PR is ready to be merged

4. **Approval & Merging**:
   - Once approved, maintainers will merge your PR
   - In some cases, you might be asked to rebase if there are conflicts

## Issue Reporting Guidelines

When creating an issue, please use the appropriate issue template if available and include:

1. **For Bug Reports**:
   - A clear and descriptive title
   - Steps to reproduce the issue
   - Expected vs. actual behavior
   - System information (OS, Rust version, etc.)
   - Screenshots or logs if applicable

2. **For Feature Requests**:
   - A clear and descriptive title
   - A detailed description of the proposed feature
   - Any relevant context or examples
   - Potential implementation approaches if you have ideas

3. **For Questions or Help**:
   - Be specific about what you're trying to achieve
   - Include what you've already tried
   - Provide context about your environment

## Communication Channels

1. **GitHub Issues**: Primary place for bug reports, feature requests, and specific code discussions
2. **Pull Requests**: For code review and contribution discussions
3. **Discord Server**: Join our community Discord for real-time discussions (link coming soon)
4. **Mailing List**: For broader discussions and announcements (coming soon)

When communicating, please:
- Be respectful and considerate
- Be clear and concise
- Provide context and examples when possible
- Follow the Code of Conduct

## Documentation Contributions

Documentation is just as important as code. We welcome contributions to:

1. **Code Documentation**:
   - Improving inline code comments
   - Adding or enhancing function/method documentation

2. **User Documentation**:
   - Tutorials and guides
   - Feature explanations
   - Command references

3. **Project Documentation**:
   - README improvements
   - Wiki pages
   - Contributing guidelines

## Recognition

Contributors are recognized in several ways:
- All merged PRs are included in release notes
- Significant contributors are added to the README.md acknowledgments
- Consistent contributors may be invited to join as maintainers

## Thank You!

Again, thank you for your interest in contributing to Warp Terminal Clone. Your efforts help make this project better for everyone!

