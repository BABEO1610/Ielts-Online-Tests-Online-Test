/**
 * TutorTestFormPage.jsx — Task 4.4.2
 * Form Tạo/Sửa đề thi (Tutor View)
 * 
 * Điền thông tin: Tiêu đề, loại bài, độ khó, thời gian. Lên lịch publish.
 * Form chuẩn Bootstrap: form-label, form-control, form-select.
 * Design: Uber-inspired form-card with clean inputs.
 */
import React, { useState } from 'react';
import '../../styles/objective-testing.css';

function TutorTestFormPage() {
  const [formData, setFormData] = useState({
    title: '', description: '', skill: '',
    difficulty: '', duration: 60,
    isPublished: false, publishAt: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container py-4" style={{ maxWidth: 700 }}>
      <div className="page-heading">
        <h1>Create new test</h1>
        <p>Fill in the basic information for your mock test.</p>
      </div>

      <div className="form-card" id="test-form-card">
        {/* Title */}
        <div className="form-group">
          <label htmlFor="input-title">Test title</label>
          <input type="text" id="input-title" placeholder="e.g. Cambridge IELTS 18 — Reading Test 1" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="input-description">Description</label>
          <textarea id="input-description" rows="3" placeholder="Brief description of this test..." value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
        </div>

        {/* Skill + Difficulty Row */}
        <div className="row g-3">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="select-skill">Skill type</label>
              <select id="select-skill" value={formData.skill} onChange={(e) => handleChange('skill', e.target.value)}>
                <option value="">Select skill</option>
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
              </select>
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="select-difficulty">Difficulty</label>
              <select id="select-difficulty" value={formData.difficulty} onChange={(e) => handleChange('difficulty', e.target.value)}>
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="form-group">
          <label htmlFor="input-duration">Duration (minutes)</label>
          <input type="number" id="input-duration" min="1" max="180" value={formData.duration} onChange={(e) => handleChange('duration', e.target.value)} />
        </div>

        {/* Schedule Publish */}
        <div className="form-group">
          <label htmlFor="input-publish-at">Schedule publish (optional)</label>
          <input type="datetime-local" id="input-publish-at" value={formData.publishAt} onChange={(e) => handleChange('publishAt', e.target.value)} />
        </div>

        {/* Actions */}
        <div className="d-flex gap-3 mt-4" style={{ borderTop: '1px solid var(--surface-pressed)', paddingTop: 'var(--spacing-xl)' }}>
          <button className="button-primary flex-fill" id="btn-save-test" style={{ padding: '14px 0' }}>Save test</button>
          <button className="button-secondary flex-fill" id="btn-save-draft" style={{ padding: '14px 0', border: '1px solid var(--surface-pressed)' }}>Save as draft</button>
        </div>
      </div>
    </div>
  );
}

export default TutorTestFormPage;
