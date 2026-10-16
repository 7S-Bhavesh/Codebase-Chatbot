import weaviate from "weaviate-client";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
});

async function setupWeaviate() {
  let client;

  try {
    console.log("Starting Weaviate setup...");

    // 1. Validate environment variables
    const required = ["WEAVIATE_URL", "WEAVIATE_API_KEY", "JINA_API_KEY"];

    for (const name of required) {
      if (!process.env[name]?.trim()) {
        throw new Error(`Missing environment variable: ${name}`);
      }
    }

    // Accept either a hostname or a full HTTPS URL
    const rawUrl = process.env.WEAVIATE_URL.trim();
    const weaviateUrl = rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;

    // 2. Connect
    client = await weaviate.connectToWeaviateCloud(weaviateUrl, {
      authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
      headers: {
        "X-JinaAI-Api-Key": process.env.JINA_API_KEY,
      },
    });

    console.log("Connected to Weaviate");

    // 3. Create collection only if missing
    const collectionName = "RepoCodeChunk";
    const exists = await client.collections.exists(collectionName);

    if (exists) {
      console.log(`${collectionName} already exists`);
    } else {
      // Support the current and older v3 configuration helpers.
      const jinaVectorizer =
        weaviate.configure.vectors?.text2VecJinaAI ??
        weaviate.configure.vectorizer?.text2VecJinaAI;

      if (!jinaVectorizer) {
        throw new Error(
          "This client version lacks the Jina vectorizer helper. " +
            "Run npm list weaviate-client and share the version.",
        );
      }

      await client.collections.create({
        name: collectionName,

        vectorizers: jinaVectorizer({
          model: "jina-embeddings-v2-base-en",
        }),

        properties: [
          {
            name: "text",
            dataType: "text",
            description: "The code chunk content",
          },
          {
            name: "repourl",
            dataType: "text",
            description: "Repository URL",
          },
          {
            name: "userid",
            dataType: "text",
            description: "User email",
          },
        ],
      });

      console.log(`${collectionName} created successfully`);
    }

    // 4. Verify collection can be queried
    const collection = client.collections.get(collectionName);
    const result = await collection.query.fetchObjects({
      limit: 1,
    });

    console.log("Collection query succeeded");

    if (result.objects.length === 0) {
      console.log(
        "Collection is empty. Import/index your repository before chatting.",
      );
    } else {
      console.log("Collection contains data");
    }

    console.log("Weaviate setup complete");
  } finally {
    if (client) {
      await client.close();
    }
  }
}

setupWeaviate().catch((error) => {
  console.error("Weaviate setup failed:", error);
  process.exitCode = 1;
});
