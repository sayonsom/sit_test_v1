import React, { useEffect, useState } from "react";
import { useLTI } from "../contexts/LTIContext";
import Spinner from "../components/Spinner";
import axios from 'axios'; 
import AppLayout from "./AppLayout";
import AvailableExperiments from "../components/AvailableExperiments";
import NewProjectCreation from "../components/NewProjectCreation";
import ShowEnrolledCourses from "../components/ShowEnrolledCourses";
import FirstTimeUser from "../components/FirstTimeUser";
import { API_URL } from "../env";

const apiUrl = API_URL;

export default function Home() {
  const [isUserCheckComplete, setIsUserCheckComplete] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const { isAuthenticated, user, isLoading: ltiLoading } = useLTI();
  const [showFirstTimeUser, setShowFirstTimeUser] = useState(false);
  const [userFullName, setUserFullName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkUserLogins = async (email) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/students/logins/${email}`);
      const numberOfLogins = response.data.number_of_logins;
      setShowFirstTimeUser(numberOfLogins < 50);
    } catch (error) {
      console.error('Error fetching number of logins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("User is authenticated via LTI");
      setUserFullName(user.name);
      
      // User data already stored by LTIContext, but ensure sessionStorage compatibility
      if (!sessionStorage.getItem('HVLABuserEmail')) {
        sessionStorage.setItem('HVLABuserEmail', user.email);
        sessionStorage.setItem('HVLABuserFullName', user.name);
        sessionStorage.setItem('StudentID', user.user_id);
      }

      // Try the test-cors API to see if the server is reachable
      axios.get(`${apiUrl}/test-cors`)
        .then(response => {
          console.log('API is reachable:', response.data);
        })
        .catch(error => {
          console.error('API is not reachable:', error);
        });

      const fetchOrCreateStudent = async (email) => {
        try {
          const response = await axios.get(`${apiUrl}/student-id/${email}`);
          sessionStorage.setItem("StudentID", response.data);
          await recordLogin(email); // Record login if user exists
        } catch (error) {
          if (error.response && error.response.status === 404) {
            try {
              const response = await axios.post(`${apiUrl}/students/`, {
                name: user.name,
                email: user.email,
                date_of_birth: "1999-01-01",
                profile_picture: user.picture,
                location: "Somewhere on Earth"
              });
              sessionStorage.setItem("StudentID", response.data.student_id);
              await recordLogin(user.email); // Record login for new user
            } catch (postError) {
              console.error('Error creating new student:', postError);
            }
          } else {
            console.error('Error fetching student ID:', error);
          }
        }
        setIsLoading(false);
        sessionStorage.setItem("HVLABuserEmail", user.email);
        sessionStorage.setItem("HVLABuserFullName", user.name);
        setIsUserCheckComplete(true);
        checkUserLogins(email);
      };

      const recordLogin = async (email) => {
        try {
          await axios.post(`${apiUrl}/students/logins`, { email });
        } catch (error) {
          console.error('Error recording login:', error);
        }
      };

      fetchOrCreateStudent(user.email);
    } else {
      console.log("User is not authenticated");
    }
  }, [isAuthenticated, user]);

  return (
    <AppLayout>
      <div className="min-h-full">
        <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-10 sm:pb-24 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-heading font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">
                Enrolled Courses
              </h2>
            </div>
            <div className="mt-4 flex md:ml-4 md:mt-0 font-sans">
              <NewProjectCreation />
            </div>
          </div>
          <div className="mt-12">
            <ShowEnrolledCourses />
          </div>
        </div>
        {isLoading ? <Spinner /> : showFirstTimeUser && <FirstTimeUser />}
      </div>
    </AppLayout>
  );
}
