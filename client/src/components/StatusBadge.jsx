export default function StatusBadge({status,overdue}){
 return <span className={`badge ${String(status).toLowerCase().replaceAll(' ','-')}`}>{status}{overdue?' · Overdue':''}</span>
}
