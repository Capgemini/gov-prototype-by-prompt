export const PLAYWRIGHT_MONGO_PORT = 27018;
export const PLAYWRIGHT_MONGO_DB_NAME = 'gov-prototype-playwright';
export const PLAYWRIGHT_MONGODB_URI = `mongodb://127.0.0.1:${String(PLAYWRIGHT_MONGO_PORT)}/${PLAYWRIGHT_MONGO_DB_NAME}?directConnection=true`;
