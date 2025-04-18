
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/hooks/use-toast";
import Dashboard from '@/components/Dashboard';
import FileUploader from '@/components/FileUploader';
import { ClassData, ProcessedData, ViewMode } from '@/types/data';
import { processZipFile } from '@/utils/fileProcessing';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<ProcessedData[]>([]);
  const [showUploader, setShowUploader] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false);
  const navigate = useNavigate();

  // Check authentication status
  useEffect(() => {
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Initial session check
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setAuthChecked(true);

      // Check for admin bypass from localStorage (set during login)
      const adminBypass = localStorage.getItem('adminBypass') === 'true';
      setAdminBypass(adminBypass);
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authChecked && !user && !adminBypass) {
      navigate('/auth');
    }
  }, [authChecked, user, adminBypass, navigate]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      setLoading(true);
      setProgress(0);
      setShowUploader(false);
      
      const processedData = await processZipFile(file, (percentage) => {
        setProgress(percentage);
      });
      
      // Filter out future dates before setting data
      const today = new Date();
      const filteredData = processedData.filter(item => {
        // Check if the class date is in the past or today
        if (item.period) {
          const [month, year] = item.period.split('-');
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = months.indexOf(month);
          const fullYear = 2000 + parseInt(year); // Assuming years are in format '22' for 2022
          
          const periodDate = new Date(fullYear, monthIndex);
          return periodDate <= today;
        }
        return true; // Include items without period data
      });
      
      setData(filteredData);
      toast({
        title: "Success",
        description: "Data processed successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to process file. Please try again.",
        variant: "destructive",
      });
      setShowUploader(true);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setShowUploader(true);
    setData([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('adminBypass');
    navigate('/auth');
  };

  // Show loading state while checking authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {showUploader ? (
          <div className="animate-fade-in">
            <div className="flex flex-col items-center mb-8">
              <div className="flex flex-col items-center animate-scale-in">
                <img src="https://i.imgur.com/9mOm7gP.png" alt="Logo" className="h-24 w-auto mb-4 animate-pulse hover:scale-110 transition-all duration-300" />
                <h1 className="text-4xl font-bold mb-4 text-slate-800 dark:text-slate-100 text-center bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 text-transparent">
                  Class Performance & Analytics
                </h1>
                <div className="flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-amber-500 animate-pulse mr-2" />
                  <p className="text-center text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Analyze class performance metrics, explore trends, and gain insights
                  </p>
                  <Sparkles className="h-6 w-6 text-amber-500 animate-pulse ml-2" />
                </div>
              </div>
              
              <button 
                onClick={handleLogout} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Sign Out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <FileUploader onFileUpload={handleFileUpload} />
          </div>
        ) : (
          <Dashboard 
            data={data} 
            loading={loading} 
            progress={progress} 
            onReset={resetUpload}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
