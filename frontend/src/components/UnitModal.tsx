import React, { useEffect } from 'react';
import './UnitModal.css';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const UnitModal: React.FC<UnitModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="unit-modal-overlay" onClick={onClose}>
      <div className="unit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="unit-modal-header">
          <h2>{title}</h2>
          <button className="unit-modal-close" onClick={onClose}>
            <i className='bx bx-x'></i>
          </button>
        </div>
        <div className="unit-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default UnitModal;
