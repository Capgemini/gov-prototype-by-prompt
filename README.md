# Gov Prototype by Prompt

This tool lets you rapidly create prototype forms from a simple description using Generative AI.

The generated prototypes use GOV.UK Design System components and best practices.

You can test prototypes live, share them with others, and download them to run them locally. You can also edit prototypes to make iterative improvements.

This is an exploratory proof-of-concept developed by the AI & Innovation Lab within Capgemini's Digital Excellence team to showcase the potential for AI to transform user research.

See [the user guides](/docs/help/) for more information about how the application works. These are also available when the application is running.

If you would like to contribute, please see the instructions in [docs/CONTRIBUTING.md](/docs/CONTRIBUTING.md). Notable changes will be documented in [docs/CHANGELOG.md](/docs/CHANGELOG.md).

If you want to contact the maintainers directly, please [complete this form](https://forms.office.com/e/bctaftxd8h).

## How does it work?

1. The user describes the form they want in plain English.
2. A GenAI LLM takes this and [a JSON schema](data/extract-form-questions-schema.json), and uses them to generate a JSON representation of the form's structure that adheres to the schema ([see example](data/example-llm-response.json)).
3. The JSON structure of the form is then used to generate Nunjucks template files of the prototype.
4. The generated template files are then rendered live for the user to try out, or can be downloaded in a ZIP file to run locally or incorporate into an existing project.

<https://github.com/user-attachments/assets/51bd61f6-e57e-45a8-8776-46f26871878c>

## Technology stack

The project uses Express.js v5 with Node.js v20. It's written in TypeScript. Tests and LLM evaluations use the Jest testing framework.

It connects to an OpenAI LLM running in Azure; we have been using GPT-4.1-mini.

It uses MongoDB to store data about users, prototypes, and workspaces in a NoSQL database.

## Setup

To run the application you can either:

- Install MongoDB and Node.js manually and run the application locally.
- Use Docker Compose to run the application with MongoDB.

In both cases, you'll need to setup environment variables and deploy an OpenAI LLM in Azure as described below.

You can access the running application at <http://localhost:3001>.

You can access the MongoDB database through [MongoDB Compass](https://www.mongodb.com/products/tools/compass) or another MongoDB client using the `mongodb://admin:password123@localhost:27017/?directConnection=true` connection string.

### Manual setup

#### Setup a local MongoDB database

1. Install [Docker Desktop](https://www.docker.com/get-started/), which is required to create a local MongoDB Atlas deployment.
2. Install the [MongoDB Atlas CLI](https://www.mongodb.com/docs/atlas/cli/current/install-atlas-cli/).
3. Run `atlas auth login` to authenticate with Atlas.
4. Run `atlas deployments setup gpbp --type LOCAL --mdbVersion 8.0 --port 27017 --username admin --password password123` to create a local MongoDB v8 deployment.
5. You should be able to see the MongoDB deployment container running in Docker Desktop.

#### Setup the application

1. Install [Node version manager (nvm)](https://github.com/nvm-sh/nvm).
2. Install the latest version of Node.js v20 with `nvm install 20` and switch to it with `nvm use 20`.
3. Check Node JS is ready with the right version using `node --version`.
4. Copy the example environment file with `cp .env.example .env` and fill out your environment variables; [see below](#environment-variables) for details. Use `mongodb://admin:password123@127.0.0.1:27017/gpbp?directConnection=true&authSource=admin` for the `MONGODB_URI` variable.
5. Run `npm install --ignore-scripts` to install the dependencies safely.
6. Run the application with `npm run start` and visit <http://localhost:3001>.

### Docker Compose setup

1. [Install Docker Compose](https://docs.docker.com/compose/install/), likely as part of Docker Desktop.
2. Copy the example environment file with `cp .env.example .env` and fill out your environment variables; [see below](#environment-variables) for details. Use `mongodb://admin:password123@127.0.0.1:27017/gpbp?directConnection=true&authSource=admin` for the `MONGODB_URI` variable.
3. Run `docker compose up --build` to build and start the application and MongoDB containers.
4. Visit <http://localhost:3001>.

### Environment variables

The following environment variables are expected in `.env`, copied from [.env.example](.env.example):

- `APPLICATIONINSIGHTS_CONNECTION_STRING` - the connection string for Azure Application Insights, can be left empty to disable.
- `AZURE_OPENAI_API_KEY` - the API key to access the OpenAI API.
- `AZURE_OPENAI_API_VERSION` - the API version for the OpenAI API.
- `AZURE_OPENAI_DEPLOYMENT_NAME` - the OpenAI model deployment.
- `AZURE_OPENAI_ENDPOINT` - the base URL for the OpenAI API.
- `AZURE_OPENAI_MODEL_NAME` - the OpenAI model ID to query.
- `EMAIL_ADDRESS_ALLOWED_DOMAIN` - the domain to allow for email addresses, e.g. `example.com`. If set, only email addresses with this domain will be allowed.
- `EMAIL_ADDRESS_ALLOWED_DOMAIN_REVEAL` - either `true` or `false`. If set to `true`, the allowed domain will be revealed to users when they sign up. If set to `false`, the allowed domain will not be revealed. This has no effect if `EMAIL_ADDRESS_ALLOWED_DOMAIN` is not set.
- `LOG_USER_ID_IN_AZURE_APP_INSIGHTS` - either `true` or `false`. Whether to log the user ID in Azure Application Insights.
- `MONGODB_URI` - the connection string for MongoDB.
- `MONGO_INITDB_ROOT_USERNAME` - the root username for MongoDB, for Docker Compose setups.
- `MONGO_INITDB_ROOT_PASSWORD` - the root password for MongoDB, for Docker Compose setups.
- `NODE_ENV` - either `development` or `production`, default `production`. When in production, the OpenTelemetry Instrumentation with Azure App Insights is enabled, the HSTS header is enabled, and the rate limiting headers are disabled.
- `RATE_LIMITER_ENABLED` - either `true` or `false`. Whether to enable rate limiting.
- `RATE_LIMITER_MAX_REQUESTS` - the maximum number of requests allowed per user in the rate limit window.
- `RATE_LIMITER_WINDOW_MINUTES` - the time window in minutes for the rate limit.
- `SESSION_SECRET` - the secret used to sign session cookies.
- `SUGGESTIONS_ENABLED` - either `true` or `false`. Whether to suggest follow-up prompts to the user to modify their prototype.

### Deploying an OpenAI LLM in Azure

The application uses an OpenAI LLM running in Azure. The configuration for the model must be provided in the `.env` file, which includes the API key, endpoint, and model name.

Visit the [Azure OpenAI documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/create-resource) for more information on how to set up an OpenAI model in Azure.

## Project structure

The project is structured as follows:

- [`.cspell/`](.cspell/) – Custom dictionary for spelling checks.
- [`.github/`](.github/) – GitHub configuration files (Actions workflows, templates, Dependabot configuration).
- [`.vscode/`](.vscode/) – Visual Studio Code workspace extensions and settings.
- [`data/`](data/) – Example data, schemas, and project files for the ZIP download of the prototype.
- [`docs/`](docs/) – Project documentation and a user help guide.
- [`evals/`](evals/) – Automated tests for evaluating the LLM's output against expected form structures.
- [`jest/`](jest/) – Jest configuration and setup files for testing.
- [`migrations/`](migrations/) – Mongoose database migration scripts.
- [`public/`](public/) – Static assets not provided by third-parties.
- [`src/`](src/) – Application source code (Express routes, utilities, business logic, data models).
  - Tests are in a `__tests__` folder within each source folder.
- [`views/`](views/) – Nunjucks templates for all pages and components.

The entry point for the application is [`server.ts`](/server.ts), which sets up the Express server, middleware, and routes.

## DevOps

### Mongoose database migrations

Database migrations are managed using [ts-migrate-mongoose](https://www.npmjs.com/package/ts-migrate-mongoose). Migration scripts are located in the [`migrations/`](migrations/) folder.

To allow migrations to connect to the MongoDB database within Docker Compose, update the `MONGODB_URI` in your `.env` file to `mongodb://admin:password123@127.0.0.1:27017/gpbp?directConnection=true&authSource=admin`, then run `docker compose up mongodb` to start the MongoDB container only.

Run `npx migrate up` to run all pending migrations.

Migrations that have already been applied are tracked in the `migrations` collection in the MongoDB database.

Migrations cannot be rolled back; please backup your database before running migrations if necessary.

### Running the Dockerfile directly

A Dockerfile is provided to build the application into a Docker image. You may need to [enable host networking in Docker Desktop settings](https://docs.docker.com/engine/network/drivers/host/#docker-desktop) to run this directly, so it can connect to the MongoDB container.

You can build and run the image with the following commands:

```bash
# Build the Docker image
docker build -t gov-prototype-by-prompt .

# Run the Docker container
docker run --network host --env-file .env gov-prototype-by-prompt
```

### Automated dependency updates with Dependabot

We use [Dependabot](https://docs.github.com/en/code-security/dependabot) to automate dependency updates. It creates pull requests to update dependencies in `package.json` and `package-lock.json` files, as well as in GitHub Actions.

The configuration for Dependabot is in the [.github/dependabot.yml](/.github/dependabot.yml) file.

## Legal notes

This project is not affiliated with the UK Government.

At the time of writing, if your site or service is not part of GOV.UK then it must not [[source](https://www.gov.uk/service-manual/design/making-your-service-look-like-govuk)]:

- identify itself as being part of GOV.UK
- use the crown or GOV.UK logotype in the header
- use the GDS Transport typeface
- suggest that it’s an official UK government website if it's not

No assessment has been made of this application's compliance with UK GDPR or other data protection or privacy laws. No guarantees are made regarding the security of the application.

The list of common passwords has been sourced from [Have I Been Pwned](https://haveibeenpwned.com/Passwords) and is used to prevent users from using common passwords.

### License

This project is licensed under the terms of the [MIT License](/LICENSE).
