import React from 'react';
import Lottie from 'react-lottie';
import loadingAnimation from './asset/jsonUse.json';

interface TooltipProps {
  message: string;
  animationSrc?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ message }) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loadingAnimation,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice"
    }
  };

  return (
    <div className="tooltip">
      <Lottie
        options={defaultOptions}
        height={200}
        width={200}
        isClickToPauseDisabled={true}
      />
      <p>{message}</p>
    </div>
  );
};

export default Tooltip;