interface BrandMarkProps {
  className?: string;
}

/**
 * Travel Globe's signature: a personal world crossed by one continuous journey.
 *
 * The simple geometry stays legible from a browser icon to the large service-story mark.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`brand-mark${className ? ` ${className}` : ""}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle className="brand-mark__ocean" cx="32" cy="32" r="27" />
      <path
        className="brand-mark__land"
        d="M17.5 19.8c4.3-5.2 10.8-8.1 17.5-7.7 4 .2 6.2 1.4 8.2 3.4 1.5 1.6 1.4 3.5-.8 4.3l-4.7 1.7c-2 .7-3 2.9-2.2 4.8l1.2 2.8c.8 1.9-.3 4-2.3 4.5l-3.7.9c-2.2.5-4.3-.9-4.6-3.1l-.6-4.1c-.3-2.1-2.2-3.5-4.3-3.2l-1.2.2c-2.8.4-4.3-2.4-2.5-4.5Z"
      />
      <path
        className="brand-mark__land brand-mark__land--small"
        d="M39.6 37.3c2.1-1.5 5.1-.5 5.7 2l.8 3.1c.4 1.5-.2 3.1-1.5 4l-3.3 2.3c-1.7 1.2-4.1.5-4.9-1.4l-.8-1.9c-.7-1.6-.1-3.5 1.3-4.5l2.7-3.6Z"
      />
      <ellipse className="brand-mark__grid" cx="32" cy="32" rx="12.5" ry="27" />
      <path className="brand-mark__grid" d="M7.5 31.7c7.4-5.1 16-7.7 25.8-7.7 8.8 0 16.4 2.1 22.8 6.4" />
      <path
        className="brand-mark__route"
        d="M11.5 41.8c8.6 6.2 20.2 5.7 28.5-.6 5.1-3.9 8.8-9.1 11.6-15.8"
      />
      <circle className="brand-mark__origin" cx="11.5" cy="41.8" r="2.7" />
      <circle className="brand-mark__destination-ring" cx="51.7" cy="25.3" r="5" />
      <circle className="brand-mark__destination" cx="51.7" cy="25.3" r="2.1" />
    </svg>
  );
}
