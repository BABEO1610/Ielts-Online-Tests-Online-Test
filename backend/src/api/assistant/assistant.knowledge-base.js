const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_DIR = path.join(__dirname, 'knowledge-base');
const REGISTRY_FILE = 'registry.json';

let cachedCorpus = null;

const readJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const assertString = (value, fieldName, source) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid knowledge chunk ${source}: missing string field "${fieldName}"`);
  }
};

const assertStringArray = (value, fieldName, source) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid knowledge metadata ${source}: field "${fieldName}" must be a string array`);
  }
};

const validateRegistryEntry = (entry) => {
  if (!isObject(entry)) {
    throw new Error('Invalid knowledge registry entry: expected object');
  }
  assertString(entry.file, 'file', 'registry');
  if (entry.skill !== null && entry.skill !== undefined && typeof entry.skill !== 'string') {
    throw new Error(`Invalid knowledge registry entry ${entry.file}: skill must be string or null`);
  }
  assertStringArray(entry.questionTypes || [], 'questionTypes', entry.file);
  assertStringArray(entry.categories || [], 'categories', entry.file);
  assertStringArray(entry.matchHints || [], 'matchHints', entry.file);
  return {
    file: entry.file,
    skill: entry.skill || null,
    questionTypes: entry.questionTypes || [],
    categories: entry.categories || [],
    matchHints: entry.matchHints || [],
  };
};

const validateChunk = (chunk, sourceFile) => {
  if (!isObject(chunk)) {
    throw new Error(`Invalid knowledge chunk in ${sourceFile}: expected object`);
  }
  ['id', 'title', 'skill', 'questionType', 'category', 'content'].forEach((field) => {
    assertString(chunk[field], field, sourceFile);
  });
  assertStringArray(chunk.tags || [], 'tags', sourceFile);
  return {
    id: chunk.id,
    title: chunk.title,
    skill: chunk.skill,
    questionType: chunk.questionType,
    category: chunk.category,
    bandRange: typeof chunk.bandRange === 'string' ? chunk.bandRange : null,
    tags: chunk.tags || [],
    sourceName: typeof chunk.sourceName === 'string' ? chunk.sourceName : 'IELTSZone Static Knowledge Base',
    content: chunk.content,
    sourceFile,
  };
};

const loadKnowledgeBase = () => {
  if (cachedCorpus) return cachedCorpus;

  const registryPath = path.join(KNOWLEDGE_BASE_DIR, REGISTRY_FILE);
  const registry = readJsonFile(registryPath);
  if (!isObject(registry) || !Array.isArray(registry.files)) {
    throw new Error('Invalid knowledge registry: expected { version, files }');
  }

  const files = registry.files.map(validateRegistryEntry);
  const chunks = files.flatMap((entry) => {
    const chunksPath = path.join(KNOWLEDGE_BASE_DIR, entry.file);
    const fileChunks = readJsonFile(chunksPath);
    if (!Array.isArray(fileChunks)) {
      throw new Error(`Invalid knowledge file ${entry.file}: expected array`);
    }
    return fileChunks.map((chunk) => ({
      ...validateChunk(chunk, entry.file),
      registrySkill: entry.skill,
      registryQuestionTypes: entry.questionTypes,
      registryCategories: entry.categories,
      matchHints: entry.matchHints,
    }));
  });

  cachedCorpus = {
    version: typeof registry.version === 'string' ? registry.version : null,
    files,
    chunks,
  };
  return cachedCorpus;
};

const clearKnowledgeBaseCacheForTests = () => {
  cachedCorpus = null;
};

module.exports = {
  loadKnowledgeBase,
  clearKnowledgeBaseCacheForTests,
};
