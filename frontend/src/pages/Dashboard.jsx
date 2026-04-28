import { useState, useEffect } from 'react';
import ThreeModel from '../components/ThreeModel';
import { mapMeasurementsToDescriptor } from '../utils/logicMapper';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState({ height: 170, waist: 30, hips: 40 });
  const [prompt, setPrompt] = useState('');
  const [descriptor, setDescriptor] = useState('Hourglass');
  
  // State for AI Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTexture, setActiveTexture] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Initial fetch of user history
    if (user?.token) {
      axios.get('/designs')
        .then(res => {
          if (res.data?.data) {
            setHistory(res.data.data);
          }
        })
        .catch(err => console.error("Failed fetching history:", err));
    }
  }, [user]);

  const handleUpdate = () => {
    const shape = mapMeasurementsToDescriptor(measurements.height, measurements.waist, measurements.hips);
    setDescriptor(shape);
  };

  const handleGenerate = async () => {
    if (!prompt) return alert('Please enter a design prompt!');
    setIsGenerating(true);
    
    console.log(`Generating design: "${prompt}" for "${descriptor}"`);
    
    try {
      const res = await axios.post('/designs/generate', {
        prompt: prompt,
        descriptor: descriptor
      });

      const generatedDesign = res.data.data;
      
      setActiveTexture(generatedDesign.texture_url);
      setHistory(prev => [generatedDesign, ...prev]);

    } catch (error) {
      console.error(error);
      alert("Failed to generate design: " + (error.response?.data?.error || error.message));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Virtual Atelier</h1>
          <p className="text-gray-600">Intelligent Fashion Design System</p>
        </div>
        <div className="text-sm font-medium text-gray-500">
          User ID: {user?.id}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Body Parameters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Height (cm): {measurements.height}</label>
                <input type="range" min="140" max="220" value={measurements.height} onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })} className="w-full" onBlur={handleUpdate} />
              </div>
              <div>
                <label className="block text-sm font-medium">Waist (inches): {measurements.waist}</label>
                <input type="range" min="20" max="50" value={measurements.waist} onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) })} className="w-full" onBlur={handleUpdate} />
              </div>
              <div>
                <label className="block text-sm font-medium">Hips (inches): {measurements.hips}</label>
                <input type="range" min="30" max="60" value={measurements.hips} onChange={(e) => setMeasurements({ ...measurements, hips: Number(e.target.value) })} className="w-full" onBlur={handleUpdate} />
              </div>
              <div className="pt-2">
                <span className="text-sm text-gray-500">Semantic Shape: </span>
                <span className="font-bold text-indigo-600">{descriptor}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Fashion Prompt</h2>
            <textarea 
              className="w-full border rounded-md p-3 h-24 resize-none" 
              placeholder="e.g. Cyberpunk trench coat with neon blue highlights..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
            />
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className={`mt-4 w-full py-3 rounded-md font-semibold transition-colors flex justify-center items-center gap-2 ${
                isGenerating ? 'bg-indigo-400 cursor-not-allowed text-white' : 'bg-accent hover:bg-indigo-600 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Rendering AI Design...
                </>
              ) : 'Generate 3D Outfit'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-semibold">Live 3D Visualization</h2>
               {activeTexture && <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">AI Synced</span>}
             </div>
             {/* 3D WebGL Canvas */}
             <ThreeModel activeTexture={activeTexture} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Design History</h2>
            {history.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {history.map((item) => (
                  <div key={item.id} className="cursor-pointer group relative rounded-md overflow-hidden border" onClick={() => setActiveTexture(item.texture_url)}>
                    <img src={item.texture_url} alt="History" className="w-full h-24 object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                      {item.prompt_text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent designs to show.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
