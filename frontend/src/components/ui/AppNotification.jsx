import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export default function AppNotification({ message, type = "info", duration = 3000, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in right after mount
    const enter = setTimeout(() => setVisible(true), 20);

    // Trigger fade-out before unmount
    const exit = setTimeout(() => setVisible(false), duration - 500);

    // Remove completely after animation
    const remove = setTimeout(() => onClose?.(), duration);

    return () => {
      clearTimeout(enter);
      clearTimeout(exit);
      clearTimeout(remove);
    };
  }, [duration, onClose]);

  const getStyles = (type) => {
    switch (type) {
      case "error":
        return {
          container: "bg-red-600 text-white",
          icon: <AlertCircle className="w-5 h-5 mr-2" />,
        };
      case "success":
        return {
          container: "bg-green-600 text-white",
          icon: <CheckCircle2 className="w-5 h-5 mr-2" />,
        };
      default:
        return {
          container: "bg-blue-600 text-white",
          icon: <Info className="w-5 h-5 mr-2" />,
        };
    }
  };

  const { container, icon } = getStyles(type);

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] px-4 py-3 rounded shadow-lg text-sm font-medium flex items-center
        transform transition-all duration-500 ease-in-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
        ${container}`}
    >
      {icon}
      {message}
    </div>
  );
}
