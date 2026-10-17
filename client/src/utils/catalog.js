export const imageUrl=(src)=>!src?'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80':src.startsWith('/uploads/')?`${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/,'')||'http://localhost:8000'}${src}`:src;
export const message=(e)=>e.response?.data?.message||'Something went wrong. Please try again.';
