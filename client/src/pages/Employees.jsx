import { useEffect,useRef,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { Plus,Search,Eye,Pencil,Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api';
import Loading from '../components/Loading';
import Pagination from '../components/Pagination';
import ModalConfirm from '../components/ModalConfirm';
import { departments,employeeStatuses,formatDate } from '../utils';
export default function Employees(){
 const [params,setParams]=useSearchParams(); const [data,setData]=useState(null),[loading,setLoading]=useState(true),[remove,setRemove]=useState(null),reqId=useRef(0);
 const page=Number(params.get('page')||1),search=params.get('search')||'',department=params.get('department')||'',status=params.get('status')||'';
 const update=(key,value)=>{const n=new URLSearchParams(params);value?n.set(key,value):n.delete(key);if(key!=='page')n.set('page','1');setParams(n);};
 const load=()=>{const id=++reqId.current,latest=()=>id===reqId.current;setLoading(true);api.get('/employees',{params:Object.fromEntries(params)}).then(r=>{if(latest())setData(r.data)}).catch(e=>{if(latest())toast.error(String(e))}).finally(()=>{if(latest())setLoading(false)});};
 useEffect(()=>{load();},[params.toString()]);
 const del=()=>api.delete(`/employees/${remove._id}`).then(()=>{toast.success('Employee deleted');setRemove(null);load();}).catch(e=>toast.error(String(e)));
 return <><div className="page-heading"><div><p className="eyebrow">PEOPLE</p><h1>Employees</h1><p className="muted">Manage your company team.</p></div><Link className="btn primary" to="/employees/new"><Plus size={17}/> Add Employee</Link></div>
 <section className="panel"><div className="toolbar"><label className="search-box"><Search size={17}/><input placeholder="Search name, ID or email..." value={search} onChange={e=>update('search',e.target.value)}/></label>
 <select value={department} onChange={e=>update('department',e.target.value)}><option value="">All Departments</option>{departments.map(x=><option key={x}>{x}</option>)}</select>
 <select value={status} onChange={e=>update('status',e.target.value)}><option value="">All Statuses</option>{employeeStatuses.map(x=><option key={x}>{x}</option>)}</select></div>
 {loading?<Loading/>:data?.items.length?<div className="table-wrap"><table><thead><tr><th>Employee ID</th><th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Joining Date</th><th>Actions</th></tr></thead><tbody>{data.items.map(e=><tr key={e._id}><td className="mono">{e.employeeId}</td><td><strong>{e.fullName}</strong><small className="table-sub">{e.email}</small></td><td>{e.department}</td><td>{e.role}</td><td><span className={`badge ${e.status.toLowerCase().replaceAll(' ','-')}`}>{e.status}</span></td><td>{formatDate(e.joiningDate)}</td><td><div className="actions"><Link title="View" to={`/employees/${e._id}`}><Eye size={17}/></Link><Link title="Edit" to={`/employees/${e._id}/edit`}><Pencil size={17}/></Link><button title="Delete" onClick={()=>setRemove(e)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div>:<p className="empty">No employees found. Add your first employee.</p>}
 <Pagination pagination={data?.pagination} onPage={p=>update('page',String(p))}/></section>
 <ModalConfirm open={!!remove} title="Delete employee?" message={`Delete ${remove?.fullName}? Employees with active tasks cannot be deleted.`} onCancel={()=>setRemove(null)} onConfirm={del}/></>
}
