const pendingUploadBatches = new Map<string, File[]>();

export const createPendingImageUploadBatch = (files: File[]) => {
  const uploadBatchId = crypto.randomUUID();
  pendingUploadBatches.set(uploadBatchId, files);
  return uploadBatchId;
};

export const consumePendingImageUploadBatch = (uploadBatchId: string) => {
  const files = pendingUploadBatches.get(uploadBatchId) ?? null;
  pendingUploadBatches.delete(uploadBatchId);
  return files;
};
