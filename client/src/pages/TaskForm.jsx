import {useEffect,useState} from 'react';import {Link,useNavigate,useParams} from 'react-router-dom';import toast from 'react-hot-toast';import api from '../api';import Loading from '../components/Loading';import {departments,priorities,dateInput} from '../utils';
const blank={title:'',description:'',assignedEmployee:'',department:'',priority:'',startDate:'',dueDate:''};
export default function TaskForm(){const {id}=useParams(),edit=!!id,navigate=useNavigate();const [form,setForm]=useState(blank),[employees,setEmployees]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{Promise.all([api.get('/employees',{params:{limit:100,sortBy:'fullName',order:'asc'}}),edit?api.get(`/tasks/${id}`):Promise.resolve({data:null})]).then(([emp,task])=>{const list=emp.data.items.filter(e=>e.status!=='Inactive'),t=task.data,current=t?.assignedEmployee;if(current?._id&&!list.some(e=>e._id===current._id))list.push(current);setEmployees(list);if(t){setForm({...t,assignedEmployee:current?._id||current||'',startDate:dateInput(t.startDate),dueDate:dateInput(t.dueDate)});}}).catch(e=>toast.error(String(e))).finally(()=>setLoading(false));},[id]);
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();setSaving(true);const payload={title:form.title,description:form.description,assignedEmployee:form.assignedEmployee?._id||form.assignedEmployee,department:form.department,priority:form.priority,startDate:form.startDate,dueDate:form.dueDate};try{if(edit)await api.put(`/tasks/${id}`,payload);else await api.post('/tasks',payload);toast.success(edit?'Task updated':'Task created');navigate('/tasks');}catch(e){toast.error(String(e));}finally{setSaving(false);}};
 if(loading)return <Loading/>;
 return <><div className="page-heading"><div><p className="eyebrow">WORK MANAGEMENT</p><h1>{edit?'Edit Task':'Add Task'}</h1><p className="muted">Task status starts as Todo and is managed separately.</p></div><Link className="btn secondary" to="/tasks">Back to Tasks</Link></div>
 <form className="panel form-panel" onSubmit={submit}><div className="form-grid">
 <Field label="Title" name="title" value={form.title} onChange={change} required minLength="3"/>
 <Select label="Assigned Employee" name="assignedEmployee" value={form.assignedEmployee} onChange={change} options={employees.map(e=>({value:e._id,label:`${e.fullName} · ${e.department}${e.status==='On Leave'?' (On Leave)':''}`}))}/>
 <Select label="Priority" name="priority" value={form.priority} onChange={change} options={priorities.map(x=>({value:x,label:x}))}/>
 <Select label="Department" name="department" value={form.department} onChange={change} options={departments.map(x=>({value:x,label:x}))}/>
 <Field label="Start Date" name="startDate" type="date" value={form.startDate} onChange={change} required/>
 <Field label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={change} required min={form.startDate}/>
 <label className="field full"><span>Description</span><textarea name="description" rows="4" maxLength="2000" value={form.description||''} onChange={change} placeholder="Describe the task..."/></label>
 </div><div className="form-actions"><Link className="btn secondary" to="/tasks">Cancel</Link><button className="btn primary" disabled={saving}>{saving?'Saving...':edit?'Save Changes':'Create Task'}</button></div></form></>}
function Field({label,...props}){return <label className="field"><span>{label}</span><input {...props}/></label>}
function Select({label,options,...props}){return <label className="field"><span>{label}</span><select {...props} required><option value="">Select {label}</option>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select></label>}
