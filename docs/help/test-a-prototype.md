## Test a prototype <!-- markdownlint-disable-line first-line-h1 -->

You can interact with a live demo of the prototype produced using the viewer on the right hand side; you can also reset this view.

Data entered into the live demo is unique for each user. You can reset this for the current user using the "Reset demo" button.

### Running the generated prototype locally

The Nunjucks template files and associated files can also be downloaded in a ZIP file within an Express (Node.js TypeScript) project, which you can use to run the prototype locally.

1. Install [Node version manager (nvm)](https://github.com/nvm-sh/nvm) if you have not already.
2. Install the latest version of Node.js v20 with `nvm install 20` and switch to it with `nvm use 20`.
3. Check Node JS is ready with the right version with `node --version`.
4. Download and extract the ZIP file, and open a terminal window within the extracted folder.
5. Run `npm install` to install the project dependencies.
6. Run `npm run start` to run the project.
7. Visit <http://localhost:3000/your-prototype/start> to test the prototype, replacing `your-prototype` with your ZIP download name.
