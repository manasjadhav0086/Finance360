export default function Loader({
  message = 'Loading Data...',
  submessage = 'Retrieving financial data and calculating metrics...',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 h-[100%] text-center w-full bg-white/60 rounded-xl backdrop-blur-xs border border-slate-200 shadow-xs animate-pulse">
      <div className="relative w-16 h-16 mb-5">
        <div className="absolute inset-0 rounded-full border-4 border-blue-600/15" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
        <div className="absolute inset-3 rounded-full bg-blue-600/10 flex items-center justify-center text-lg text-blue-600 font-bold">
          ₹
        </div>
      </div>

      <div className="text-lg font-bold text-slate-900 mb-1.5 tracking-tight">
        {message}
      </div>

      <div className="text-sm text-slate-500 max-w-md mb-4 font-normal">
        {submessage}
      </div>
    </div>
  );
}
