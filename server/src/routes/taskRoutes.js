import { Router } from 'express';
import * as c from '../controllers/taskController.js';
const router = Router();
router.get('/export/csv', c.exportTasks);
router.route('/').get(c.listTasks).post(c.createTaskController);
router.put('/:id/status', c.updateTaskStatus);
router.route('/:id').get(c.getTask).put(c.updateTaskController).delete(c.deleteTask);
export default router;
