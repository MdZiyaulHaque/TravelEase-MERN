import React from 'react';
export default function RatingStars({value=0,onChange}){
 return <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n=>onChange?<button type="button" key={n} onClick={()=>onChange(n)} aria-label={`${n} stars`} className={`text-2xl ${n<=value?'text-amber-400':'text-slate-300'}`}>★</button>:<span key={n} className={`text-xl ${n<=Math.round(value)?'text-amber-400':'text-slate-300'}`}>★</span>)}</div>
}
