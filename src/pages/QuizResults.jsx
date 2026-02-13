import React, { useEffect, useState } from 'react';
import AppLayout from './AppLayout';
import { useLTI } from "../contexts/LTIContext";
import QuizResultsTable from "../components/QuizResultsTable";
import axios from "axios";
import { API_URL } from "../env";

export default function QuizResults() {

    const apiUrl = API_URL;

    // const { isAuthenticated, user } = useAuth0();
    const [quizData, setQuizData] = useState(null);
    const [modulesData, setModulesData] = useState([]);
    // const [StudentID, setStudentID] = useState(null);

    // Function to fetch quiz data
    // const getQuizData = async (StudentID) => {
    //     try {
    //     const response = await fetch(`${apiUrl}/students/${StudentID}/assignments/responses`);

    //     if (!response.ok) {
    //         throw new Error(`HTTP error! Status: ${response.status}`);
    //     }
    //     const data = await response.json();
    //     return data; // This should be an array of modules with assignments
    //     } catch (error) {
    //     console.error("Fetching quiz data failed:", error);
    //     }
    // };

    // user data from LTI
    const { user } = useLTI();

    // Get StudentID from session storage (set by LTI context)
    const StudentID = sessionStorage.getItem("StudentID");

    // Get quiz data
useEffect(() => {
    if (StudentID) {
      getQuizData(StudentID).then((data) => {
        // Assuming the fetched data is an array of modules like shown in the screenshot
        setModulesData(data); // Here you set the modules data instead of quizData
        console.log("Modules Quiz data", data);
      }).catch((error) => {
        console.error("Failed to fetch quiz data:", error);
        // Handle error state here. Maybe setModulesData to an empty array or show a message.
      });
    }
  }, [StudentID]);
  
  // Assuming getQuizData is defined like this:
  const getQuizData = async (studentId) => {
    try {
      const response = await axios.get(`${apiUrl}/students/${StudentID}/assignments/responses`);
      if (response.status === 200) {
        return response.data; // Should be the array of modules
      } else {
        throw new Error(`Received status code ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching quiz data", error);
      throw error; // Re-throw the error to be handled in the calling code
    }
  };
  

    return (
        <>
            <AppLayout>
                <div className="min-h-full">   
                    <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-10 sm:pb-24 lg:px-8">
                        {/* Page Header */}
                        <div className="md:flex md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-2xl font-heading font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">
                                    Quiz Results
                                </h2>
                            </div>
                        </div>

                        
                        {/* Pass the quiz data to the QuizResultsTable component */}
                        <div className="mt-8">
                            <p>
                                
                                {modulesData ? (
                                    <QuizResultsTable modules={modulesData} />
                                ) : (
                                    "Loading..."
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </AppLayout>
        </>
    );
}
