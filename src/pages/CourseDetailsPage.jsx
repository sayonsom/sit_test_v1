import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AppLayout from "./AppLayout";
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
import CourseDetailsColumn from "../components/CourseDetailsColumn";
import CourseModulesColumn from "../components/CourseModulesColumn";
import Spinner from "../components/Spinner";
import { API_URL } from "../env";

const apiUrl = API_URL;

export default function CourseDetailsPage() {
    const { courseShortCode } = useParams();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const response = await axios.get(`${apiUrl}/courses/${courseShortCode}`);
        setCourse(response.data);
        console.log("Course details")
        console.log(response.data)
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching course details', error);
        alert("Error fetching course details", error);
        setIsLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseShortCode]);



    if (isLoading) {
        return (
            <AppLayout>
                <div className="max-w-md w-full space-y-8">
                    <div className="flex flex-col items-center">
                        <Spinner />
                    </div>
                </div>
            </AppLayout>
        )
    }

    return ( 
        <> 
        <AppLayout>
            {/* PAGE HEADING */}
            <div className="min-h-full"> 

            {/* div to show the title of the course */}
            <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
                <h1 className="font-heading text-4xl text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">{course.title} </h1>
                {/* <Badge color="pink">{offering_institute}</Badge> */}
                <div className="font-sans mt-4 max-w-4xl text-xl text-gray-700 dark:text-gray-400">
                    <p>{course.description}</p>
                </div>
            </div>

                <div className="flex flex-col md:flex-row"> {/* Stack on small screens, side by side on medium screens and up */}
                    <div className="md:w-1/3 bg-white dark:bg-gray-900 px-4 py-6"> {/* This is the first column */}
                        <CourseModulesColumn course={course} />
                    </div>
                    <div className="md:w-2/3 bg-white dark:bg-gray-700 px-4 py-6"> {/* This is the second column */}
                        <CourseDetailsColumn course={course} />
                    </div>
                </div>

            </div>
        </AppLayout>
        </>
    )
}
