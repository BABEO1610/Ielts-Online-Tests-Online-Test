const adminMetricsService = require('../services/adminMetrics.service');

const csvEscape = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const getOverview = async (req, res, next) => {
  try {
    const data = await adminMetricsService.getOverview();
    res.status(200).json({ success: true, data, error: null, meta: null });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const data = await adminMetricsService.getReports(req.query);
    res.status(200).json({ success: true, data, error: null, meta: null });
  } catch (error) {
    next(error);
  }
};

const exportReportsCsv = async (req, res, next) => {
  try {
    const report = await adminMetricsService.getReports(req.query);
    const rows = report.daily.map((row) => [
      row.date,
      row.newUsers,
      row.attempts,
      row.aiCalls,
      row.aiTokens,
      row.submissions,
    ]);
    const csv = [
      'Date,New Users,Attempts,AI Calls,AI Tokens,Submissions',
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n');
    const filename = `admin-report-${report.range.from}-to-${report.range.to}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    next(error);
  }
};

const getAiUsage = async (req, res, next) => {
  try {
    const data = await adminMetricsService.getAiUsage(req.query);
    res.status(200).json({ success: true, data, error: null, meta: null });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOverview,
  getReports,
  exportReportsCsv,
  getAiUsage,
};
