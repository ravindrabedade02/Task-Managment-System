import { Router } from 'express';
import * as c from '../controllers/employeeController.js';
const router = Router();
router.route('/').get(c.listEmployees).post(c.createEmployee);
router.route('/:id').get(c.getEmployee).put(c.updateEmployee).delete(c.deleteEmployee);
export default router;
