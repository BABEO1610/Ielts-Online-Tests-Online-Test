const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const contractPath = path.resolve(__dirname, '../../../.sdd/specs/ai-fast-grading/contracts/speaking-grading.openapi.yaml');
const document = YAML.parse(fs.readFileSync(contractPath, 'utf8'));

const walk = (value, callback) => {
  if (!value || typeof value !== 'object') return;
  callback(value);
  Object.values(value).forEach((child) => walk(child, callback));
};

describe('Speaking OpenAPI contract', () => {
  test('is OpenAPI 3.1 and contains every implemented path', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining([
      '/speaking/audio-uploads',
      '/speaking/full',
      '/speaking/{speakingGroupId}/grading-status',
      '/speaking/{speakingGroupId}/retry-grading',
      '/tutors/submissions/speaking/{speakingGroupId}/claim',
      '/tutors/submissions/speaking/{submissionId}/ai-prelim',
      '/{submissionId}/audio-url',
    ]));
  });

  test('all internal references resolve', () => {
    const unresolved = [];
    walk(document, (node) => {
      if (!node.$ref?.startsWith('#/')) return;
      const target = node.$ref.slice(2).split('/').reduce((value, key) => value?.[key], document);
      if (!target) unresolved.push(node.$ref);
    });
    expect(unresolved).toEqual([]);
  });

  test('success and error envelopes always expose meta as an object', () => {
    expect(document.components.schemas.SuccessEnvelopeBase.properties.meta.type).toBe('object');
    expect(document.components.schemas.TutorAiPrelimEnvelope.properties.meta.type).toBe('object');
    expect(document.components.schemas.ErrorEnvelope.properties.meta.type).toBe('object');
  });

  test('transcript-only criteria and Overall cannot contain a band', () => {
    const schema = document.components.schemas.TranscriptOnlyReviewResult;
    expect(JSON.stringify(schema)).toContain('TranscriptOnlyCriteria');
    expect(JSON.stringify(schema)).toContain('overall_band');
    expect(JSON.stringify(schema)).toContain("null");
  });

  test('upload response exposes an opaque token, never a public audio URL or object key', () => {
    const properties = document.components.schemas.AudioUploadData.properties;
    expect(properties).toHaveProperty('upload_token');
    expect(properties).not.toHaveProperty('audio_url');
    expect(properties).not.toHaveProperty('object_key');
  });

  test('full submission documents independent AI enqueue and tutor-selected branches', () => {
    const operation = document.paths['/speaking/full'].post;
    expect(document.components.schemas.FullSpeakingRequest.properties.grader.enum)
      .toEqual(['ai', 'tutor']);
    expect(operation.responses['201'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/TutorSubmissionEnvelope');
    expect(operation.responses['202'].content['application/json'].schema.$ref)
      .toBe('#/components/schemas/AsyncJobEnvelope');
  });

  test('every sensitive success response is explicitly non-cacheable', () => {
    const responses = [
      document.paths['/speaking/audio-uploads'].post.responses['201'],
      document.paths['/speaking/full'].post.responses['201'],
      document.paths['/speaking/full'].post.responses['202'],
      document.paths['/speaking/{speakingGroupId}/grading-status'].get.responses['200'],
      document.paths['/speaking/{speakingGroupId}/retry-grading'].post.responses['202'],
      document.paths['/tutors/submissions/speaking/{speakingGroupId}/claim'].post.responses['200'],
      document.paths['/tutors/submissions/speaking/{submissionId}/ai-prelim'].post.responses['200'],
      document.paths['/{submissionId}/audio-url'].get.responses['200'],
    ];
    responses.forEach((response) => {
      expect(response.headers['Cache-Control'].schema.const).toBe('private, no-store');
    });
  });
});
