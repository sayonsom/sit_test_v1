import React from 'react';
import PropTypes from 'prop-types';

const VideoCard = ({ videoLink }) => {
  // Function to convert short URL to embeddable URL
  const getEmbedUrl = (shortUrl) => {
    const videoId = shortUrl.split('youtu.be/')[1];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const embedUrl = getEmbedUrl(videoLink);

  return (
    <div className="max-w-full mt-4 shadow-lg">
      <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Let's watch a video
      </h5>
      <div className="video-responsive">
        <iframe
          width="100%"
          height="315"
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

VideoCard.propTypes = {
  videoLink: PropTypes.string.isRequired,
};

export default VideoCard;
