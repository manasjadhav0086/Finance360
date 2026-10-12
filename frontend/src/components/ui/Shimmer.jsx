function Shimmer({ className = "", style = {} }) {
  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          .shimmer-loader {
            background: linear-gradient(
              90deg,
              #f0f3fa 25%,
              #e2e8f0 50%,
              #f0f3fa 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.2s infinite linear;
          }
        `}
      </style>

      <div
        className={`shimmer-loader ${className}`}
        style={{
          borderRadius: "8px",
          ...style,
        }}
      />
    </>
  );
}

export default Shimmer;
