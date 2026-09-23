import { startNoShowWorker } from './noShow.worker.js';

export const startAllWorkers = () => {
  startNoShowWorker();
  console.log('✅ All workers started');
};