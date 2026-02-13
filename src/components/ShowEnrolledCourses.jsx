import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Badge } from 'flowbite-react';
import Spinner from './Spinner';
import { API_URL } from "../env";

const apiUrl = API_URL;

const ShowEnrolledCourses = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // grab the email from the local storage
  const email = sessionStorage.getItem('HVLABuserEmail');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${apiUrl}/students/${email}/courses`);
        setCourses(response.data);
      } catch (error) {
        console.error('Error fetching courses', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (email) {
      fetchCourses();
    }
  }, [email]);

  if (isLoading) {
    return <div><Spinner/></div>;
  }

  return (
    <div>
      {courses.length === 0 ? (
        // When no courses are found
        <div>
          <button
            type="button"
            className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {/* ... button contents ... */}
            <span className="mt-2 block text-sm font-semibold text-gray-900">+ Enroll in a new course</span>
          </button>
        </div>
      ) : (
        // When one or more courses are found
        courses.map(course => (
          <a href={`/courses/${course.course_id}`} key={course.course_id} className="flex flex-col items-center bg-white border border-gray-200 rounded-lg shadow md:flex-row md:max-w-xl hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
            <img className="object-cover w-full rounded-t-lg h-96 md:h-auto md:w-48 md:rounded-none md:rounded-l-lg" src={course.course_image} alt={course.title} />
            <div className="flex flex-col justify-between p-4 leading-normal">
              <h5 className="font-heading mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{course.title}</h5>
              <p className="font-sans mb-3 font-normal text-gray-700 dark:text-gray-400 text-xs">{course.offering_institute}</p>
              <Badge color="pink">Ends on {course.session_end_date}</Badge>
              <p className="font-sans mb-3 font-normal text-gray-700 dark:text-gray-400">{course.description}</p>
            </div>
          </a>
        ))
      )}
    </div>
  );
};

export default ShowEnrolledCourses;
