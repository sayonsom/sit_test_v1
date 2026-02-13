import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { LTI_API_URL } from "../env";

export default function AppEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const sessionToken = searchParams.get("session_token");
    const errorParam = searchParams.get("error");
    
    // Check if there's an error from LTI backend
    if (errorParam) {
      console.error('LTI launch error:', errorParam);
      setError(errorParam);
      setTimeout(() => {
        navigate("/lti-required", { replace: true, state: { error: errorParam } });
      }, 2000);
      return;
    }
    
    if (!sessionToken) {
      console.error('No session token provided');
      navigate("/lti-required", { replace: true });
      return;
    }

    // Validate and store session token
    const validateSession = async () => {
      try {
        const response = await axios.get(
          `${LTI_API_URL}/lti/session/validate`,
          { 
            headers: { Authorization: `Bearer ${sessionToken}` },
            timeout: 10000
          }
        );
        
        console.log('Session validated successfully');
        
        // Store session token
        localStorage.setItem('lti_session_token', sessionToken);
        
        // Store user and course data for immediate access
        localStorage.setItem('lti_user', JSON.stringify(response.data.user));
        localStorage.setItem('lti_course', JSON.stringify(response.data.course));
        
        // Also store in sessionStorage for compatibility with existing code
        sessionStorage.setItem('HVLABuserEmail', response.data.user.email);
        sessionStorage.setItem('HVLABuserFullName', response.data.user.name);
        sessionStorage.setItem('StudentID', response.data.user.user_id);
        
        // Navigate to home
        navigate("/home", { replace: true });
      } catch (error) {
        console.error('Session validation failed:', error);
        setError('Session validation failed');
        setTimeout(() => {
          navigate("/lti-required", { replace: true });
        }, 2000);
      }
    };

    validateSession();
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md px-6">
        {error ? (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
            <p className="text-gray-600">There was a problem with your LTI launch.</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="mb-4">
              <svg className="animate-spin mx-auto h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authenticating...</h2>
            <p className="text-gray-600">Please wait while we set up your session.</p>
          </>
        )}
      </div>
    </div>
  );
}
