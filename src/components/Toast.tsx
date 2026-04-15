import React, { useEffect, useRef } from 'react';

interface ToastProps {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Toast: React.FC<ToastProps> = ({ show, onClose, children }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onCloseRef.current(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 top-4 flex justify-center z-50" onClick={onClose}>
      {children}
    </div>
  );
};

export default Toast;
