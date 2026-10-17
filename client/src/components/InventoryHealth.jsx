import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {RefreshCcw,AlertTriangle,CheckCircle2} from 'lucide-react';
import api from '../services/api';
export default function InventoryHealth(){
 const [state,setState]=useState({loading:true,data:null,error:''});
 const [tick,setTick]=useState(0);
 useEffect(()=>{let alive=true;setState(x=>({...x,loading:true,error:''}));
 api.get('/dashboard/operations').then(r=>{if(alive)setState({loading:false,data:r.data.data,error:''})})
 .catch(e=>{if(alive)setState({loading:false,data:null,error:e.response?.data?.message||'Unable to load inventory health'})});
 return()=>{alive=false};},[tick]);
 return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Inventory health">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Inventory Health</h2><p className="text-xs text-slate-500">Reserved seats compared with active booking travelers (read-only)</p></div>
 <button type="button" onClick={()=>setTick(x=>x+1)} disabled={state.loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"><RefreshCcw size={15}/>Refresh inventory</button></div>
 {state.loading?<p role="status" className="mt-4 text-slate-500">Checking departures...</p>:state.error?<p role="alert" className="mt-4 text-red-700">{state.error}</p>:<>
 <div className="mt-4 flex items-center gap-2 text-sm font-semibold">{state.data.mismatches?<AlertTriangle className="text-amber-600" size={18}/>:<CheckCircle2 className="text-emerald-600" size={18}/>}{state.data.mismatches?`${state.data.mismatches} departure(s) need review`:'All departure seat counts match active travelers'}</div>
 <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Date','Capacity','Reserved','Active travelers','Available','Status'].map(h=><th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead><tbody>{state.data.inventory.map(d=><tr key={d._id} className="border-t"><td className="whitespace-nowrap px-3 py-2">{d.date}</td><td className="px-3 py-2">{d.capacity}</td><td className="px-3 py-2">{d.reserved}</td><td className="px-3 py-2">{d.activeTravelers}</td><td className="px-3 py-2">{d.availableSeats}</td><td className={'px-3 py-2 font-semibold '+(d.mismatch?'text-amber-700':'text-emerald-700')}>{d.mismatch?'Review':'OK'}</td></tr>)}</tbody></table></div>
 <p className="mt-3 text-xs text-slate-500">Mismatch detection is advisory. Do not automatically modify inventory. <Link className="underline" to="/admin/bookings">Review bookings</Link></p></>}
 </section>;
}
