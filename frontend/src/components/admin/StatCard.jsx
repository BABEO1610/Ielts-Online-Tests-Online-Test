import React from 'react';

/**
 * StatCard — metric tile for the admin dashboard.
 * @param {string} label   Metric caption
 * @param {string|number} value  Main figure (already formatted)
 * @param {string} [delta] Optional change text (e.g. "+5 tuần này")
 * @param {'up'|'down'} [trend] Direction of delta colour
 * @param {boolean} [dark] Polarity-flipped (ink) variant for the hero metric
 * @param {string} [icon] Optional leading glyph
 */
const StatCard = ({ label, value, delta, trend = 'up', dark = false, icon }) => (
  <div className={`stat-card${dark ? ' stat-card--dark' : ''}`} data-testid="stat-card">
    <span className="stat-card__label">{icon ? `${icon} ` : ''}{label}</span>
    <span className="stat-card__value">{value}</span>
    {delta && <span className={`stat-card__delta ${trend}`}>{delta}</span>}
  </div>
);

export default StatCard;
