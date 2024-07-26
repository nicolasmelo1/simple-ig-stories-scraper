import { streamToBuffer } from './utils';
import { ConfigFileAuthenticationDetailsProvider } from 'oci-common'; 
import { ObjectStorageClient, NodeFSBlob, requests } from 'oci-objectstorage';
import { statSync, readdirSync, rmSync } from "fs";
import internal from 'stream';

const provider = new ConfigFileAuthenticationDetailsProvider('~/.oci/config', 'DEFAULT');
const client = new ObjectStorageClient({ authenticationDetailsProvider: provider });


export function offloadToBucketClient() {
  const args: {
    timeout?: NodeJS.Timeout
  } = {};
  
  async function recursivelyOffloadStoriesToBucket() {
    if (args.timeout) clearTimeout(args.timeout);
    const allFilesOnDirectory = readdirSync('./stories');
    try {
      for (const file of allFilesOnDirectory) {
        const request: requests.GetNamespaceRequest = {};
        const namespaceResponse = await client.getNamespace(request);
        const namespace = namespaceResponse.value;
        
        // Create read stream to file
        const stats = statSync(`./stories/${file}`);
        const nodeFsBlob = new NodeFSBlob(`./stories/${file}`, stats.size);
        const objectData = await nodeFsBlob.getData();

        console.log("Bucket is created. Now adding object to the Bucket.");
        const putObjectRequest: requests.PutObjectRequest = {
          namespaceName: namespace,
          bucketName: 'user-stories',
          putObjectBody: objectData,
          objectName: file,
          contentLength: stats.size
        };

        const [response, putObjectResponse] = await Promise.all([
          fetch('http://localhost:3000/api/stories/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fileName: file
            })
          }), 
          client.putObject(putObjectRequest)
        ]);
        console.log('Response from server', await response.json());
        console.log("Put Object executed successfully", JSON.stringify(putObjectResponse, null, 2));
        rmSync(`./stories/${file}`);
      }
      const timeout = setTimeout(() => recursivelyOffloadStoriesToBucket(), 20000);
      args.timeout = timeout;
    } catch (e) {
      const timeout = setTimeout(() => recursivelyOffloadStoriesToBucket(), 20000);
      args.timeout = timeout;
    }
  }

  return {
    start: () => recursivelyOffloadStoriesToBucket(),
    getFromBucket: async (objectName: string) => {
      const request: requests.GetNamespaceRequest = {};
      const response = await client.getNamespace(request);
      const namespace = response.value;

      const getObjectRequest: requests.GetObjectRequest = {
        namespaceName: namespace,
        bucketName: 'user-stories',
        objectName
      };
      
      const getObjectResponse = await client.getObject(getObjectRequest);
      console.log('Get object response', getObjectResponse);
      return streamToBuffer(getObjectResponse.value);
    },
    stop: () => {
      if (args.timeout) clearTimeout(args.timeout)
    }
  }
}


export const bucketClient = offloadToBucketClient();
