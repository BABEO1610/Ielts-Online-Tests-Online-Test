const path = require('node:path');
require('node:dns').setDefaultResultOrder('ipv4first');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: false });

const logger = require('./utils/logger');
const { aiGradingConfig } = require('./config/aiGrading.config');
const { AiGradingWorker } = require('./jobs/aiGrading.worker');
const { AiGradingWatchdog } = require('./jobs/aiGrading.watchdog');
const { AudioUploadCleanupJob } = require('./jobs/audioUploadCleanup.job');

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const main = async () => {
  if (!aiGradingConfig.enabled) {
    logger.warn('AI Speaking worker is disabled by feature flag');
    return;
  }
  const worker = new AiGradingWorker();
  const watchdog = new AiGradingWatchdog();
  const cleanup = new AudioUploadCleanupJob();
  let stopped = false;
  process.once('SIGTERM', () => { stopped = true; });
  process.once('SIGINT', () => { stopped = true; });
  let cycles = 0;
  let lastCleanupAt = 0;
  while (!stopped) {
    try {
      const result = await worker.runOnce();
      cycles += 1;
      if (cycles % 30 === 0) await watchdog.recoverOne();
      if (Date.now() - lastCleanupAt >= aiGradingConfig.storage.cleanupIntervalSeconds * 1000) {
        lastCleanupAt = Date.now();
        await cleanup.runBatch().catch((error) => logger.warn('Audio cleanup cycle skipped', {
          errorCode: error.code || 'AUDIO_CLEANUP_UNAVAILABLE',
        }));
      }
      if (result.status === 'idle') await delay(aiGradingConfig.workerPollMs);
    } catch (error) {
      logger.error('AI Speaking worker loop error', { errorCode: error.errorCode || error.code || 'WORKER_LOOP_FAILED' });
      await delay(aiGradingConfig.workerPollMs);
    }
  }
};

if (require.main === module) {
  main().catch((error) => {
    logger.error('AI Speaking worker startup failed', { errorCode: error.errorCode || error.code || 'WORKER_STARTUP_FAILED' });
    process.exitCode = 1;
  });
}

module.exports = { main };
