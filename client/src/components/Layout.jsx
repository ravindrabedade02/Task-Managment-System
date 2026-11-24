import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ListTodo, BriefcaseBusiness } from 'lucide-react';
export default function Layout(){
 return <div className="app-shell">
  <header className="topbar"><NavLink to="/" className="brand"><span className="brand-mark">R</span><span>Roots <small>MEDIA MARKETING</small></span></NavLink>
   <div className="top-title">MERN Stack Developer Practical Task</div>
   <nav><NavLink to="/"><LayoutDashboard size={16}/> Dashboard</NavLink><NavLink to="/employees"><Users size={16}/> Employees</NavLink><NavLink to="/tasks"><ListTodo size={16}/> Tasks</NavLink></nav>
  </header><main className="main-content"><Outlet/></main>
  <footer>Roots Media Marketing · Employee & Task Management</footer>
 </div>
}
