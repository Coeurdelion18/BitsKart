import React, {createContext, useState} from "react";
import AuthService from "../api/authService";


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try{
      const data = await AuthService.login(email, password);
      localStorage.setItem("token", data.token);
      setUser(data.user);
    }catch(error){
      // If login fails, re-throw the error so the component can catch it
      console.error("Login error in context:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  );
};