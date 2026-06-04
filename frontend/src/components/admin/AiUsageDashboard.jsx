import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Admin Dashboard Component to monitor AI usage (Calls and Tokens).
 */
const AiUsageDashboard = ({ usageData, isLoading, error, onFetchData }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = (e) => {
    e.preventDefault();
    // EARS[Event]: WHEN Admin clicks Filter, THEN trigger fetch data with selected dates
    if (onFetchData) {
      onFetchData({ startDate, endDate });
    }
  };

  // Calculate totals
  const totalCalls = usageData ? usageData.reduce((acc, curr) => acc + (curr.calls || 0), 0) : 0;
  const totalTokens = usageData ? usageData.reduce((acc, curr) => acc + (curr.tokens || 0), 0) : 0;

  return (
    <div className="container-fluid py-4" data-testid="ai-usage-dashboard">
      <h3 className="mb-4 text-primary"><i className="bi bi-graph-up me-2"></i>AI Usage Dashboard</h3>

      {/* Filters Section */}
      <div className="card shadow-sm mb-4 border-0 bg-light">
        <div className="card-body">
          <form onSubmit={handleFilter} className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="startDate" className="form-label fw-bold">Start Date</label>
              <input
                type="date"
                className="form-control"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="start-date-input"
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="endDate" className="form-label fw-bold">End Date</label>
              <input
                type="date"
                className="form-control"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="end-date-input"
              />
            </div>
            <div className="col-md-4">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={isLoading}
                data-testid="filter-btn"
              >
                <i className="bi bi-funnel-fill me-2"></i>Filter
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* EARS[State]: WHEN error occurs, THEN show alert */}
      {error && (
        <div className="alert alert-danger" role="alert" data-testid="dashboard-error">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {typeof error === 'string' ? error : error.message || 'Failed to load usage data.'}
        </div>
      )}

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card bg-primary text-white shadow h-100 border-0">
            <div className="card-body">
              <h5 className="card-title text-uppercase text-white-50">Total AI Calls</h5>
              <h2 className="display-4 fw-bold mb-0" data-testid="total-calls">{totalCalls}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-success text-white shadow h-100 border-0">
            <div className="card-body">
              <h5 className="card-title text-uppercase text-white-50">Total Tokens Used</h5>
              <h2 className="display-4 fw-bold mb-0" data-testid="total-tokens">{totalTokens.toLocaleString()}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 text-secondary">Usage Breakdown</h5>
        </div>
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center p-5" data-testid="dashboard-loading">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : !usageData || usageData.length === 0 ? (
            <div className="text-center p-5 text-muted" data-testid="dashboard-empty">
              <i className="bi bi-inbox fs-1 d-block mb-3"></i>
              No usage data found for the selected date range.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-striped mb-0" data-testid="usage-table">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="px-4">Date</th>
                    <th scope="col">Feature</th>
                    <th scope="col" className="text-end">Calls</th>
                    <th scope="col" className="text-end px-4">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.map((row, index) => (
                    /* EARS[Constraint]: The UI MUST NOT render any user generated content like essays or chats to comply with ADM-01/05 */
                    <tr key={index}>
                      <td className="px-4">{row.date}</td>
                      <td>
                        <span className="badge bg-secondary">{row.feature}</span>
                      </td>
                      <td className="text-end fw-bold">{row.calls}</td>
                      <td className="text-end px-4">{row.tokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

AiUsageDashboard.propTypes = {
  usageData: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    feature: PropTypes.string.isRequired,
    calls: PropTypes.number.isRequired,
    tokens: PropTypes.number.isRequired
  })),
  isLoading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onFetchData: PropTypes.func.isRequired
};

AiUsageDashboard.defaultProps = {
  usageData: [],
  isLoading: false,
  error: null
};

export default AiUsageDashboard;
