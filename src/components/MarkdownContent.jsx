import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import axios from 'axios';
import Spinner from './Spinner';
// import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusSmallIcon, PlusSmallIcon } from '@heroicons/react/24/outline'
import { API_URL } from "../env";

const MarkdownContent = ({ contentURL }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState('');

  const apiUrl = API_URL;

  const getSignedUrl = async () => {
    try {
      const response = await axios.get(`${apiUrl}/generate-signed-url/?blob_name=${contentURL}`);
      setSignedUrl(response.data.url);
    } catch (error) {
      console.error('Error generating signed URL', error);
    }
  };

  const fetchContent = async (url) => {
    try {
      const response = await axios.get(url);
      setContent(response.data);
    } catch (error) {
      console.error('Error fetching content', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      await getSignedUrl();
    };

    loadContent();
  }, [contentURL]);

  useEffect(() => {
    if (signedUrl) {
      fetchContent(signedUrl);
    }
  }, [signedUrl]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center">
        <Spinner />
      </div>
    );
  }

  return (
    // Accordion or collapsible content
    <>
      
      {/* <Disclosure as="div"  className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <DisclosureButton className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7">Read Theory in Depth</span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusSmallIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <PlusSmallIcon className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                      </DisclosureButton>
                    </dt>
                    <DisclosurePanel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600">
                        <div className="prose font-sans dark:prose-invert text-justify">
                          <ReactMarkdown
                            children={content}
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          />
                        </div>
                      </p>
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure> */}
              <p className="text-base leading-7 text-gray-600">
                        <div className="prose font-sans dark:prose-invert text-justify">
                          <ReactMarkdown
                            children={content}
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          />
                        </div>
                      </p>
    </>

    
  );
};

export default MarkdownContent;
