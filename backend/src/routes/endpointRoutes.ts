import { Router } from 'express';
import { listEndpoints, getEndpoint, createEndpoint, updateEndpoint, deleteEndpoint } from '../controllers/endpointController';

const router = Router();

router.get('/', listEndpoints);
router.get('/:id', getEndpoint);
router.post('/', createEndpoint);
router.put('/:id', updateEndpoint);
router.delete('/:id', deleteEndpoint);

export default router;
