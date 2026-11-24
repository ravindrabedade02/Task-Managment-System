export default function ModalConfirm({open,title,message,onCancel,onConfirm}){
 if(!open)return null;
 return <div className="modal-backdrop"><div className="modal"><h3>{title}</h3><p>{message}</p><div className="form-actions"><button className="btn secondary" onClick={onCancel}>Cancel</button><button className="btn danger" onClick={onConfirm}>Delete</button></div></div></div>
}
