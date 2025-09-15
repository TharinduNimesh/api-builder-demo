import { Router } from 'express';
import { proxyEndpoint } from '../controllers/apiBuilderController';

const router = Router();

// This will capture any method and any path under /api/api-builder
router.all('/*', proxyEndpoint);

export default router;
