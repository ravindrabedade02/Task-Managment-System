import {Routes,Route,Navigate} from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import EmployeeDetails from './pages/EmployeeDetails';
import Tasks from './pages/Tasks';
import TaskForm from './pages/TaskForm';
import TaskDetails from './pages/TaskDetails';
export default function App(){return <Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="employees" element={<Employees/>}/><Route path="employees/new" element={<EmployeeForm/>}/><Route path="employees/:id" element={<EmployeeDetails/>}/><Route path="employees/:id/edit" element={<EmployeeForm/>}/><Route path="tasks" element={<Tasks/>}/><Route path="tasks/new" element={<TaskForm/>}/><Route path="tasks/:id" element={<TaskDetails/>}/><Route path="tasks/:id/edit" element={<TaskForm/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes>}
