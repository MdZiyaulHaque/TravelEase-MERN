import axios from 'axios';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:8000/api',timeout:10000,withCredentials:true});
api.interceptors.response.use(response=>response,error=>{
 if(error.code==='ECONNABORTED')error.userMessage='Request timed out. Please retry.';
 else if(!error.response)error.userMessage='Cannot reach server. Check your connection.';
 else error.userMessage=error.response.data?.message||'Request failed.';
 return Promise.reject(error);
});
export default api;
