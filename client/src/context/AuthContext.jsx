import {createContext,useContext,useEffect,useState} from 'react';
import api from '../services/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;api.get('/auth/me').then(({data})=>{if(active)setUser(data.user)}).catch(()=>{}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const login=async values=>{const {data}=await api.post('/auth/login',values);setUser(data.user);return data.user};
 const register=async values=>{const {data}=await api.post('/auth/register',values);setUser(data.user);return data.user};
 const logout=async()=>{await api.post('/auth/logout');setUser(null)};
 return <AuthContext.Provider value={{user,loading,login,register,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>{const v=useContext(AuthContext);if(!v)throw Error('AuthProvider missing');return v};
