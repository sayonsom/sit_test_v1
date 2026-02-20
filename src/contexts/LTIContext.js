import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { LTI_API_URL } from "../env";

const LTIContext = createContext();

const resolveLtiUrl = (path) => {
  const base = (LTI_API_URL || "").replace(/\/$/, "");
  if (!base) return path;
  if (base.startsWith("http://") || base.startsWith("https://")) return `${base}${path}`;
  if (base.startsWith("/")) return `${base}${path}`;
  if (typeof window !== "undefined") return `${window.location.origin}/${base}${path}`;
  return `${base}${path}`;
};

export const LTIProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMethod, setAuthMethod] = useState("none"); // lti | staff | none

  useEffect(() => {
    // Check for session token in localStorage
    const validateSession = async () => {
      const sessionToken = localStorage.getItem('lti_session_token');
      
      if (sessionToken) {
        try {
          const response = await axios.get(
            `${LTI_API_URL}/lti/session/validate`,
            { 
              headers: { Authorization: `Bearer ${sessionToken}` },
              timeout: 10000 
            }
          );
          
          setUser(response.data.user);
          setCourse(response.data.course);
          setIsAuthenticated(true);
          setAuthMethod("lti");
          // If a staff session existed, clear it to avoid confusion.
          localStorage.removeItem('staff_user');
          
          console.log('Session validated:', {
            user: response.data.user.email,
            course: response.data.course.course_title
          });
        } catch (error) {
          console.error('Session validation failed:', error);
          // Clear invalid session
          localStorage.removeItem('lti_session_token');
          localStorage.removeItem('lti_user');
          localStorage.removeItem('lti_course');
          setIsAuthenticated(false);
          setUser(null);
          setCourse(null);
          setAuthMethod("none");
        }
      } else {
        // Check if we have cached user data (for immediate page loads)
        const staffUserJson = localStorage.getItem('staff_user');
        if (staffUserJson) {
          try {
            const staffUser = JSON.parse(staffUserJson);
            setUser(staffUser);
            setCourse(null);
            setIsAuthenticated(true);
            setAuthMethod("staff");
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing staff user data:', e);
            localStorage.removeItem('staff_user');
          }
        }

        const cachedUser = localStorage.getItem('lti_user');
        const cachedCourse = localStorage.getItem('lti_course');
        
        if (cachedUser && cachedCourse) {
          try {
            setUser(JSON.parse(cachedUser));
            setCourse(JSON.parse(cachedCourse));
            setIsAuthenticated(true);
            setAuthMethod("lti");
          } catch (e) {
            console.error('Error parsing cached data:', e);
          }
        }
      }
      
      setIsLoading(false);
    };

    validateSession();
    
    // Optional: Set up session refresh interval (every 30 minutes)
    const refreshInterval = setInterval(() => {
      const sessionToken = localStorage.getItem('lti_session_token');
      if (sessionToken) {
        axios.get(
          `${LTI_API_URL}/lti/session/refresh`,
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        ).catch(err => {
          console.error('Session refresh failed:', err);
        });
      }
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const loginStaff = (staffUser) => {
    localStorage.setItem('staff_user', JSON.stringify(staffUser));
    localStorage.removeItem('staff_force_reauth');
    setUser(staffUser);
    setCourse(null);
    setIsAuthenticated(true);
    setAuthMethod("staff");
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('lti_session_token');
    const hadLtiSession = Boolean(sessionToken);
    const hadStaffSession = Boolean(localStorage.getItem('staff_user'));
    
    if (sessionToken) {
      try {
        await axios.post(
          `${LTI_API_URL}/lti/logout`,
          {},
          { 
            headers: { Authorization: `Bearer ${sessionToken}` },
            timeout: 5000 
          }
        );
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with logout even if API call fails
      }
    }
    
    // Clear all LTI data
    localStorage.removeItem('lti_session_token');
    localStorage.removeItem('lti_user');
    localStorage.removeItem('lti_course');

    // Clear staff auth (if any)
    localStorage.removeItem('staff_user');
    localStorage.removeItem('staff_force_reauth');
    
    // Clear other session data
    sessionStorage.clear();
    
    setUser(null);
    setCourse(null);
    setIsAuthenticated(false);
    setAuthMethod("none");
    
    // Redirect based on previous auth method
    if (hadStaffSession) {
      localStorage.setItem('staff_force_reauth', '1');
      window.location.href = resolveLtiUrl('/lti/staff/logout');
      return;
    }
    if (hadLtiSession) {
      window.location.href = '/lti-required';
      return;
    }
    window.location.href = '/';
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('lti_user', JSON.stringify(userData));
  };

  const updateCourse = (courseData) => {
    setCourse(courseData);
    localStorage.setItem('lti_course', JSON.stringify(courseData));
  };

  return (
    <LTIContext.Provider
      value={{
        isAuthenticated,
        user,
        course,
        authMethod,
        isLoading,
        logout,
        loginStaff,
        updateUser,
        updateCourse,
      }}
    >
      {children}
    </LTIContext.Provider>
  );
};

export const useLTI = () => {
  const context = useContext(LTIContext);
  if (!context) {
    throw new Error('useLTI must be used within LTIProvider');
  }
  return context;
};

export default LTIContext;
