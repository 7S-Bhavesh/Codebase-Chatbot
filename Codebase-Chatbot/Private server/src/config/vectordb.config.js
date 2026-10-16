import weaviate from 'weaviate-client';

const weaviateUrl = process.env.WEAVIATE_URL;
const weaviateApiKey = process.env.WEAVIATE_API_KEY;
const jinaaiApiKey = process.env.JINA_API_KEY;

const client = await weaviate.connectToWeaviateCloud(
  weaviateUrl, 
  {
    authCredentials: new weaviate.ApiKey(weaviateApiKey),
    headers: {
      'X-JinaAI-Api-Key': jinaaiApiKey, 
    }
  }
);

export default client;