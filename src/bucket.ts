import { offloadToBucketClient } from "./offload-to-bucket";

export const bucketClient = offloadToBucketClient();
bucketClient.start();