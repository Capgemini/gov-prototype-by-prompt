import { z } from 'zod';

import { envVarSchema } from '../validationSchemas/env';

// Environment variables types
export type EnvironmentVariables = z.infer<typeof envVarSchema>;
