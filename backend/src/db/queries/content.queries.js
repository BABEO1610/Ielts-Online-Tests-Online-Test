/**
 * @file backend/src/db/queries/content.queries.js
 * @description Parameterized SQL queries cho chức năng Content Review.
 */

const getPendingTests = `
  SELECT 
    t.id, 
    t.title, 
    t.skill, 
    t.difficulty, 
    u.full_name AS created_by, 
    t.submitted_at, 
    t.publish_at
  FROM mock_tests t
  LEFT JOIN users u ON t.created_by = u.id
  WHERE t.review_status = 'pending'
  ORDER BY t.submitted_at ASC NULLS LAST, t.created_at ASC
`;

const getPendingResources = `
  SELECT 
    r.id, 
    r.title, 
    r.resource_type, 
    r.file_size_bytes, 
    u.full_name AS uploaded_by, 
    r.created_at
  FROM library_resources r
  LEFT JOIN users u ON r.uploaded_by = u.id
  WHERE r.review_status = 'pending'
  ORDER BY r.created_at ASC
`;

const getPublishSchedule = `
  SELECT 
    t.id, 
    t.title, 
    'test' AS kind, 
    u.full_name AS created_by, 
    t.publish_at
  FROM mock_tests t
  LEFT JOIN users u ON t.created_by = u.id
  WHERE t.review_status = 'approved' 
    AND t.is_published = FALSE
    AND t.publish_at IS NOT NULL 
    AND t.publish_at > NOW()
  ORDER BY t.publish_at ASC
`;

const updateTestReviewStatus = `
  UPDATE mock_tests
  SET 
    review_status = $2,
    is_published = CASE WHEN $2 = 'approved' THEN TRUE ELSE FALSE END,
    updated_at = NOW()
  WHERE id = $1
  RETURNING id, title, review_status
`;

const updateResourceReviewStatus = `
  UPDATE library_resources
  SET 
    review_status = $2,
    is_published = CASE WHEN $2 = 'approved' THEN TRUE ELSE FALSE END,
    updated_at = NOW()
  WHERE id = $1
  RETURNING id, title, review_status
`;

module.exports = {
  getPendingTests,
  getPendingResources,
  getPublishSchedule,
  updateTestReviewStatus,
  updateResourceReviewStatus
};
