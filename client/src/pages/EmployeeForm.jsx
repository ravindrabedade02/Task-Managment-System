import { useEffect,useState } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from '../components/Loading';
import { departments,employeeStatuses,dateInput } from '../utils';
const empty={employeeId:'',fullName:'',email:'',phone:'',department:'',role:'',joiningDate:'',status:'Active',skills:'',leaveStart:'',leaveEnd:''};
export default function EmployeeForm(){
 const {id}=useParams(),edit=!!id,navigate=useNavigate();const [form,setForm]=useState(empty),[loading,setLoading]=useState(edit),[saving,setSaving]=useState(false);
 useEffect(()=>{if(edit)api.get(`/employees/${id}`).then(r=>{const e=r.data;setForm({...e,joiningDate:dateInput(e.joiningDate),leaveStart:dateInput(e.leaveStart),leaveEnd:dateInput(e.leaveEnd),skills:(e.skills||[]).join(', ')});}).catch(e=>toast.error(String(e))).finally(()=>setLoading(false));},[id]);
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 const submit=async e=>{e.preventDefault();setSaving(true);const payload={...form,skills:form.skills.split(',').map(x=>x.trim()).filter(Boolean)};delete payload._id;delete payload.__v;delete payload.createdAt;delete payload.updatedAt;
 try{if(edit)await api.put(`/employees/${id}`,payload);else await api.post('/employees',payload);toast.success(edit?'Employee updated':'Employee created');navigate('/employees');}catch(err){toast.error(String(err));}finally{setSaving(false);}};
 if(loading)return <Loading/>;
 return <><div className="page-heading"><div><p className="eyebrow">PEOPLE</p><h1>{edit?'Edit Employee':'Add Employee'}</h1><p className="muted">Enter employee information below.</p></div><Link className="btn secondary" to="/employees">Back to Employees</Link></div>
 <form className="panel form-panel" onSubmit={submit}><div className="form-grid">
 <Field label="Employee ID" name="employeeId" value={form.employeeId} onChange={change} required disabled={edit}/>
 <Field label="Full Name" name="fullName" value={form.fullName} onChange={change} required minLength="2"/>
 <Field label="Email" name="email" type="email" value={form.email} onChange={change} required/>
 <Field label="Phone" name="phone" value={form.phone} onChange={change} required pattern="[+0-9 ()-]{7,20}"/>
 <Select label="Department" name="department" value={form.department} onChange={change} options={departments}/>
 <Field label="Role" name="role" value={form.role} onChange={change} required/>
 <Field label="Joining Date" name="joiningDate" type="date" value={form.joiningDate} onChange={change} required/>
 <Select label="Status" name="status" value={form.status} onChange={change} options={employeeStatuses}/>
 <Field label="Skills (comma separated)" name="skills" value={form.skills} onChange={change} placeholder="React, Node.js, MongoDB"/>
 {form.status==='On Leave'&&<><Field label="Leave Start" name="leaveStart" type="date" value={form.leaveStart} onChange={change} required/><Field label="Leave End" name="leaveEnd" type="date" value={form.leaveEnd} onChange={change} required/></>}
 </div><div className="form-actions"><Link className="btn secondary" to="/employees">Cancel</Link><button className="btn primary" disabled={saving}>{saving?'Saving...':edit?'Save Changes':'Create Employee'}</button></div></form></>
}
function Field({label,...props}){return <label className="field"><span>{label}</span><input {...props}/></label>}
function Select({label,options,...props}){return <label className="field"><span>{label}</span><select {...props} required><option value="">Select {label}</option>{options.map(o=><option key={o}>{o}</option>)}</select></label>}
