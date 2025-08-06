import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'offline-action-queue';

export interface OfflineAction {
  type: 'sale' | 'restock';
  payload: any;
  timestamp: number;
}

export async function addToQueue(action: OfflineAction) {
  const queue = (await get<OfflineAction[]>(QUEUE_KEY)) || [];
  queue.push(action);
  await set(QUEUE_KEY, queue);
}

export async function getQueue(): Promise<OfflineAction[]> {
  return (await get<OfflineAction[]>(QUEUE_KEY)) || [];
}

export async function clearQueue() {
  await del(QUEUE_KEY);
} 