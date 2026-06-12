import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure global API base
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const token = localStorage.getItem('token');
    const rawUser = localStorage.getItem('user');

    if (token && rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser({ ...parsedUser, token });
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userProfile) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userProfile));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser({ ...userProfile, token });
  };

  const updateUser = (userProfile) => {
    localStorage.setItem('user', JSON.stringify(userProfile));
    setUser((current) => ({
      ...current,
      ...userProfile,
    }));
  };

  const refreshUser = async () => {
    if (!localStorage.getItem('token')) {
      return null;
    }

    const response = await axios.get('/auth/me');
    updateUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
