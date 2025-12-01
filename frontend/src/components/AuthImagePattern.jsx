const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="w-full hidden lg:flex flex-col items-center justify-center bg-base-200">
      <div className="text-center px-6">

        {/* 3x3 GRID */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl bg-[#1e293b] ${
                i % 2 === 0 ? "animate-pulse" : ""
              }`}
            />
          ))}
        </div>

        {/* TEXT */}
        <h2 className="text-xl font-semibold text-white mb-2">
          {title}
        </h2>

        <p className="text-gray-400 max-w-sm">
          {subtitle}
        </p>

      </div>
    </div>
  );
};

export default AuthImagePattern;
