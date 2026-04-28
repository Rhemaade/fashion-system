import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const endpoint = isRegistering ? '/auth/register' : '/auth/login';
      const payload = isRegistering 
        ? formData 
        : { email: formData.email, password: formData.password }; // Omit username for login

      const response = await axios.post(endpoint, payload);
      
      // The backend returns { id, token } on success
      login(response.data.token, response.data.id);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || "Network error. Make sure server is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border border-gray-200">
        <h2 className="text-3xl font-bold mb-2 text-center text-primary">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {isRegistering ? 'Join the Virtual Atelier platform' : 'Enter your credentials to access your designs'}
        </p>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-700">Username</label>
              <input 
                type="text" 
                required 
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent outline-none" 
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Email Address</label>
            <input 
              type="email" 
              required 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">Password</label>
            <input 
              type="password" 
              required 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-accent outline-none" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-white py-3 mt-2 rounded-md font-bold hover:bg-indigo-600 transition-colors disabled:bg-indigo-300"
          >
            {loading ? 'Authenticating...' : (isRegistering ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isRegistering ? "Already have an account? " : "Don't have an account? "}
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }}
            className="text-accent font-semibold hover:underline"
          >
            {isRegistering ? 'Log in here' : 'Register here'}
          </button>
        </div>
      </div>
    </div>
  );
}
