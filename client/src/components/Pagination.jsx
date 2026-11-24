export default function Pagination({pagination,onPage}){
 if(!pagination || pagination.pages<=1) return null;
 return <div className="pagination"><span>Showing page {pagination.page} of {pagination.pages} · {pagination.total} records</span><div><button disabled={pagination.page<=1} onClick={()=>onPage(pagination.page-1)}>‹</button><strong>{pagination.page}</strong><button disabled={pagination.page>=pagination.pages} onClick={()=>onPage(pagination.page+1)}>›</button></div></div>
}
