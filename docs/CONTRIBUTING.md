# Contributing

Thank you for your interest in contributing to this project!

If you've found a security issue and do not want to disclose it publicly, please [complete this form](https://forms.office.com/e/bctaftxd8h) to contact the maintainers directly. Note that as per [this project's license](/LICENSE), no guarantees are made regarding the security of the application.

If you've found a bug or have a feature request, please [open an issue on GitHub](https://github.com/Capgemini/gov-prototype-by-prompt/issues/new).

If you would like to fix a bug or implement a feature, please [fork the repository](https://github.com/Capgemini/gov-prototype-by-prompt/fork) and open a pull request. Feel free to open an issue to discuss your idea first.

The project maintainers endeavour to review all contributions in a timely manner and provide feedback. The principal maintainer is Christopher Menon (@cmenon12).

## Development instructions

See the [README](/README.md#setup) for setup instructions.

If you are using Visual Studio Code, the `.vscode` folder contains configuration files to set up your IDE with the recommended settings and extensions for this project. You can install the recommended extensions by clicking on the "Extensions" icon in the sidebar, filtering by "Recommended", and then clicking on the "Install All" button.

GitHub Actions pipelines exist to run the unit tests, check linting and formatting, and check for dependency vulnerabilities. Automatic fixes for linting and formatting errors will be applied when a pull request is opened.

### Running tests

Run the command `npm test` to run the Jest test suite. We are using an in-memory MongoDB database for the tests without mocking, to try to be as close to the deployed solution as possible.

### Linting and formatting

Please ensure that the prettier and the ESLint plugins have been installed for your IDE. The following commands allow you to lint and format manually:

- Lint `npm run lint`
- Lint with fixes if applicable `npm run lint:fix`
- Format and autofix with prettier `npm run format`

### Accessibility

We use the [Axe accessibility devtools extension](https://chromewebstore.google.com/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd) to check for and resolve any accessibility issues in the UI.

## Contributing checklist

Please ensure that your contribution:

- Has appropriate and passing tests for the changes you made using Jest.
- Does not break any existing functionality or tests.
- Does not introduce any new linting or formatting errors.
- Only adds new dependencies that are necessary and do not introduce security vulnerabilities.
  - Dependency versions must use tilde (~) ranges in `package.json` to avoid breaking changes.
- Includes use of the Axe accessibility devtools extension to check for and resolve any new accessibility issues.
  - Unresolved issues should be documented in the pull request description.
- Includes updates to the documentation and help guides if necessary.
