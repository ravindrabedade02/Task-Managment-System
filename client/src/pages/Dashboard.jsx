import { useEffect,useState } from 'react';
import api from '../api';
import Loading from '../components/Loading';
import { Users,UserCheck,UserX,CalendarDays,ListTodo,Clock,CheckCircle2,XCircle,AlertTriangle } from 'lucide-react';
const employeeCards=[['Total Employees','total',Users],['Active','active',UserCheck],['Inactive','inactive',UserX],['On Leave','onLeave',CalendarDays]];
const taskCards=[['Total Tasks','total',ListTodo],['Todo','todo',Clock],['In Progress','inProgress',Clock],['Completed','completed',CheckCircle2],['Cancelled','cancelled',XCircle],['Overdue','overdue',AlertTriangle]];
export default function Dashboard(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{api.get('/dashboard').then(r=>setData(r.data)).catch(e=>setError(String(e)));},[]);
 if(error)return <div className="alert error">{error}</div>;
 if(!data)return <Loading/>;
 const cards=(items,source)=>items.map(([label,key,Icon])=><div className="stat-card" key={key}><div className="stat-icon"><Icon size={19}/></div><span>{label}</span><strong>{source[key]}</strong></div>);
 return <><div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p className="muted">Your team's activity at a glance.</p></div></div>
 <h2 className="section-title">Employees</h2><div className="stats-grid employee-stats">{cards(employeeCards,data.employees)}</div>
 <h2 className="section-title">Tasks</h2><div className="stats-grid task-stats">{cards(taskCards,data.tasks)}</div>
 <section className="panel workload"><div className="panel-heading"><div><h2>Employee Workload</h2><p className="muted">Current Todo and In Progress tasks</p></div></div>
 {data.workload.length?<div className="table-wrap"><table><thead><tr><th>Employee</th><th>Active Tasks</th></tr></thead><tbody>{data.workload.map((w,i)=><tr key={i}><td>{w.employee}</td><td><strong>{w.activeTasks}</strong></td></tr>)}</tbody></table></div>:<p className="empty">No active employee workload.</p>}</section></>
}
