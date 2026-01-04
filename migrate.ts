import 'dotenv/config';

import { getEnvironmentVariables } from './src/utils';

const envVars = getEnvironmentVariables();

export default {
    autosync: false,
    collection: 'migrations',
    migrationsPath: './migrations',
    templatePath: './migrations/template.ts',
    uri: envVars.MONGODB_URI,
};
