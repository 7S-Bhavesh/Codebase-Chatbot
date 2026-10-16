import weaviate from 'weaviate-client';

const weaviateUrl = process.env.WEAVIATE_URL;
const weaviateApiKey = process.env.WEAVIATE_API_KEY;
const jinaaiApiKey = process.env.JINA_API_KEY;

let client = null;

try {
  console.log('🔄 Connecting to Weaviate...');
  console.log('URL:', weaviateUrl);
  
  // Validate environment variables
  if (!weaviateUrl || !weaviateApiKey || !jinaaiApiKey) {
    throw new Error('Missing Weaviate configuration. Please check your .env file.');
  }

  client = await weaviate.connectToWeaviateCloud(
    weaviateUrl, 
    {
      authCredentials: new weaviate.ApiKey(weaviateApiKey),
      headers: {
        'X-JinaAI-Api-Key': jinaaiApiKey, 
      }
    }
  );
  
  console.log('✅ Successfully connected to Weaviate');
} catch (error) {
  console.error('❌ Failed to connect to Weaviate:', error.message);
  console.error('\n📋 Troubleshooting steps:');
  console.error('1. Check if your Weaviate cluster is running in the cloud dashboard');
  console.error('2. Verify WEAVIATE_URL format: should be like "https://your-cluster-name.weaviate.network"');
  console.error('3. Ensure WEAVIATE_API_KEY is correct');
  console.error('4. Check if JINA_API_KEY is valid');
  console.error('5. Make sure the RepoCodeChunk collection exists in your Weaviate instance\n');
  
  // Create a mock client to prevent crashes during development
  console.log('⚠️  Running without Weaviate connection. Some features will not work.\n');
}

export default client;
