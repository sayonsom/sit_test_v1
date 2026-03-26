import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "flowbite-react";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import AppLayout from "./AppLayout";
import Spinner from "../components/Spinner";
import { API_URL } from "../env";

const apiUrl = API_URL;

export default function StudentResultsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [courseRes, resultsRes] = await Promise.all([
          axios.get(`${apiUrl}/courses/${courseId}`),
          axios.get(`${apiUrl}/courses/${courseId}/student-results`),
        ]);
        setCourse(courseRes.data);
        setResults(resultsRes.data);
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const toggleStudent = (studentId) => {
    setExpandedStudent(expandedStudent === studentId ? null : studentId);
    setExpandedModule(null);
  };

  const toggleModule = (key) => {
    setExpandedModule(expandedModule === key ? null : key);
  };

  if (loading) {
    return (
      <AppLayout>
        <Spinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate(`/manage/course/${courseId}`)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Student Quiz Results
          </h2>
        </div>
        {course && (
          <p className="text-gray-500 dark:text-gray-400 mb-8 ml-9">
            {course.title}
          </p>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
            <p className="text-3xl font-bold text-purple-600">{results.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Students Attempted</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {results.reduce((sum, s) => sum + s.total_questions, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Responses</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 text-center">
            <p className="text-3xl font-bold text-green-600">
              {results.length > 0
                ? Math.round(
                    (results.reduce((sum, s) => sum + s.correct_answers, 0) /
                      Math.max(results.reduce((sum, s) => sum + s.total_questions, 0), 1)) *
                      100
                  )
                : 0}
              %
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average Score</p>
          </div>
        </div>

        {/* No results */}
        {results.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg">No quiz submissions yet.</p>
            <p className="text-sm mt-1">
              Students will appear here after they take a quiz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((student) => {
              const isExpanded = expandedStudent === student.student_id;
              const scorePercent =
                student.total_questions > 0
                  ? Math.round((student.correct_answers / student.total_questions) * 100)
                  : 0;

              return (
                <div
                  key={student.student_id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Student Row */}
                  <button
                    onClick={() => toggleStudent(student.student_id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {student.student_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {student.student_email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {student.correct_answers}/{student.total_questions} correct
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scorePercent >= 70
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : scorePercent >= 40
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        }`}
                      >
                        {scorePercent}%
                      </span>
                    </div>
                  </button>

                  {/* Expanded Student Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 pb-4">
                      {student.modules.map((mod) => {
                        const modKey = `${student.student_id}-${mod.module_title}`;
                        const isModExpanded = expandedModule === modKey;
                        const modPercent =
                          mod.total > 0 ? Math.round((mod.correct / mod.total) * 100) : 0;

                        return (
                          <div key={modKey} className="mt-3">
                            <button
                              onClick={() => toggleModule(modKey)}
                              className="w-full flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2">
                                {isModExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {mod.module_title}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {mod.correct}/{mod.total} ({modPercent}%)
                              </span>
                            </button>

                            {isModExpanded && (
                              <div className="ml-9 mt-2 space-y-2">
                                {mod.questions.map((q, qi) => (
                                  <div
                                    key={qi}
                                    className="flex items-start gap-3 py-2 px-3 rounded bg-gray-50 dark:bg-gray-700"
                                  >
                                    {q.is_correct ? (
                                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 dark:text-gray-200">
                                        {q.question_text}
                                      </p>
                                      <p className="text-xs mt-1">
                                        <span className="text-gray-500 dark:text-gray-400">
                                          Answer:{" "}
                                        </span>
                                        <span
                                          className={
                                            q.is_correct
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-red-600 dark:text-red-400"
                                          }
                                        >
                                          {q.student_response || "(no response)"}
                                        </span>
                                      </p>
                                      {!q.is_correct && q.correct_answer && (
                                        <p className="text-xs mt-0.5">
                                          <span className="text-gray-500 dark:text-gray-400">
                                            Correct:{" "}
                                          </span>
                                          <span className="text-green-600 dark:text-green-400">
                                            {q.correct_answer}
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
