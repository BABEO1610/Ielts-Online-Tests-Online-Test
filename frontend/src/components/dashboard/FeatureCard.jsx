import React from 'react';
import { Link } from 'react-router-dom';

const FeatureCard = ({ title, description, imageSrc, actionText, actionLink, reverse }) => {
  return (
    <div className="card border-0 rounded-4 overflow-hidden" style={{ backgroundColor: '#ffffff', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 16px 0px' }}>
      <div className={`row g-0 align-items-center ${reverse ? 'flex-row-reverse' : ''}`}>
        <div className="col-md-6">
          <div className="p-4 p-md-5">
            <h3 className="fw-bold mb-3" style={{ fontFamily: 'UberMove, system-ui, sans-serif', fontSize: '24px', color: '#000000' }}>
              {title}
            </h3>
            <p className="mb-4 text-muted" style={{ fontFamily: 'UberMoveText, system-ui, sans-serif', fontSize: '16px', lineHeight: '24px' }}>
              {description}
            </p>
            <Link 
              to={actionLink} 
              className="btn btn-dark rounded-pill fw-medium d-inline-flex align-items-center justify-content-center"
              style={{ padding: '12px 24px', fontSize: '16px' }}
            >
              {actionText}
            </Link>
          </div>
        </div>
        <div className="col-md-6 h-100">
          <img 
            src={imageSrc} 
            alt={title} 
            className="w-100 h-100 object-fit-cover" 
            style={{ aspectRatio: '4/3' }} 
          />
        </div>
      </div>
    </div>
  );
};

export default FeatureCard;
