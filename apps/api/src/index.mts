import express  from 'express';
import type {Request, Response} from 'express';
import picocolors from 'picocolors';
import logger from './utils/logger.js';

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API is running!' });
});

// Default route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the API' });
});

// Start server
app.listen(PORT, () => {
  console.log(picocolors.greenBright(`API server running on http://localhost:${PORT}`));
});