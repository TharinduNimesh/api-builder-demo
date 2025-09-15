import express from 'express';
import cors from 'cors';
import sqlFunctionRoutes from './routes/sqlFunctionRoutes';
import endpointRoutes from './routes/endpointRoutes';
import apiBuilderRoutes from './routes/apiBuilderRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());

// Enable CORS for local frontend dev (adjust origin as needed)
app.use(cors({ origin: 'localhost' }));

// Routes
app.use('/api/sql-functions', sqlFunctionRoutes);
app.use('/api/endpoints', endpointRoutes);
// catch-all API builder proxy route - should come after REST management routes
app.use('/api/api-builder', apiBuilderRoutes);

// Global error handler (after routes)
app.use(errorHandler);

export default app;
