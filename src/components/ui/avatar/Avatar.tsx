import React, { useState, useEffect } from "react";

interface AvatarProps {
  src?: string; // URL of the avatar image
  alt?: string; // Alt text for the avatar
  size?: "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge" | "3xlarge" | "4xlarge"; // Avatar size
  status?: "online" | "offline" | "busy" | "none"; // Status indicator
  className?: string; // Additional classes
  fallbackSrc?: string;
  objectPosition?: "center" | "top"; // Position alignment (default: top for passphoto headshots)
  shape?: "circle" | "square" | "portrait"; // Shape: circle (default), square (rounded 1:1), portrait (rounded 3:4)
}

const DEFAULT_AVATAR = "/images/user/default-avatar.svg";

const sizeClasses = {
  xsmall: "h-6 w-6",
  small: "h-8 w-8",
  medium: "h-10 w-10",
  large: "h-12 w-12",
  xlarge: "h-14 w-14",
  xxlarge: "h-16 w-16",
  "3xlarge": "h-24 w-24",
  "4xlarge": "h-32 w-32",
};

const statusSizeClasses = {
  xsmall: "h-1.5 w-1.5",
  small: "h-2 w-2",
  medium: "h-2.5 w-2.5",
  large: "h-3 w-3",
  xlarge: "h-3.5 w-3.5",
  xxlarge: "h-4 w-4",
  "3xlarge": "h-5 w-5",
  "4xlarge": "h-6 w-6",
};

const statusColorClasses = {
  online: "bg-success-500",
  offline: "bg-error-400",
  busy: "bg-warning-500",
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  size = "medium",
  status = "none",
  className = "",
  fallbackSrc = DEFAULT_AVATAR,
  objectPosition = "center",
  shape = "circle",
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const effectiveSrc = !src || src.trim() === "" || hasError ? fallbackSrc : src;
  const isDefaultAvatar = effectiveSrc === fallbackSrc || effectiveSrc.includes("default-avatar.svg");
  const positionClass = isDefaultAvatar 
    ? "object-center" 
    : (objectPosition === "center" ? "object-center" : "object-top");

  // Determine shape styles
  let shapeWrapperClass = "rounded-full aspect-square";
  let shapeImgClass = "rounded-full aspect-square";

  if (shape === "square") {
    shapeWrapperClass = "rounded-xl aspect-square";
    shapeImgClass = "rounded-xl aspect-square";
  } else if (shape === "portrait") {
    // 3:4 aspect ratio. Tall rectangle with rounded corners.
    // If aspect ratio is 3:4, we override default aspect-square sizing.
    shapeWrapperClass = "rounded-2xl aspect-[3/4]";
    shapeImgClass = "rounded-2xl aspect-[3/4]";
  }

  // Adjust size class if shape is portrait to have a natural height-width balance
  let sizeClass = sizeClasses[size] || "";
  if (shape === "portrait" && size === "4xlarge") {
    // Customize size classes to be tall for portrait avatar
    sizeClass = "w-32 h-40 md:w-36 md:h-48";
  } else if (shape === "portrait") {
    sizeClass = "w-16 h-20 md:w-24 md:h-32";
  }

  return (
    <div className={`relative shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800 ${shapeWrapperClass} ${sizeClass} ${className}`}>
      {/* Avatar Image */}
      <img
        src={effectiveSrc}
        alt={alt}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover ${positionClass} ${shapeImgClass}`}
      />

      {/* Status Indicator */}
      {status !== "none" && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
            statusSizeClasses[size]
          } ${statusColorClasses[status] || ""}`}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
