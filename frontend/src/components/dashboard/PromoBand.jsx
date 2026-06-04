import React from 'react';
import { Link } from 'react-router-dom';

const PromoBand = ({ title, description, actionText, actionLink, illustrationUrl }) => {
  return (
    <div className="card border-0 rounded-4 overflow-hidden mb-5" style={{ backgroundColor: '#000000', color: '#ffffff' }}>
      <div className="row g-0 align-items-center">
        <div className="col-md-7 col-lg-8">
          <div className="p-4 p-md-5">
            <h2 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '32px' }}>
              {title}
            </h2>
            <p className="mb-4" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '18px', color: '#e2e2e2' }}>
              {description}
            </p>
            <Link 
              to={actionLink} 
              className="btn btn-light rounded-pill fw-bold d-inline-flex align-items-center justify-content-center"
              style={{ padding: '12px 24px', fontSize: '16px', color: '#000000' }}
            >
              {actionText}
            </Link>
          </div>
        </div>
        <div className="col-md-5 col-lg-4 d-none d-md-block h-100">
          {illustrationUrl && (
            <img 
              src={illustrationUrl} 
              alt="Promo illustration" 
              className="w-100 h-100 object-fit-cover opacity-75"
              style={{ minHeight: '300px' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoBand;
