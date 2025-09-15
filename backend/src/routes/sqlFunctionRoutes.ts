import { Router } from 'express';
import {
  createSqlFunction,
  listSqlFunctions,
  getSqlFunction,
  updateSqlFunction,
  deleteSqlFunction,
  runSql,
} from '../controllers/sqlFunctionController';

const router = Router();

router.get('/', listSqlFunctions);
router.get('/:id', getSqlFunction);
router.post('/', createSqlFunction);
router.post('/run', runSql);
router.put('/:id', updateSqlFunction);
router.delete('/:id', deleteSqlFunction);

export default router;
