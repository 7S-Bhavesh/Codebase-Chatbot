export function buildAugmentedPrompt(userQuery, result) {
  if (!result?.objects || result.objects.length === 0) {
    return `
User Question:
${userQuery}

Answer the question with best general knowledge.
`;
  }

  let contextText = "";

  result.objects.forEach((item, index) => {
    const content = item.properties?.text || "No content";
    const repo = item.properties?.repourl || "Unknown repo";
    const distance = item.metadata?.distance;

    contextText += `
Result ${index + 1}
Repository: ${repo}
Similarity score: ${distance}

Code snippet:
${content}

------------------------
`;
  });

  const finalPrompt = `
User question:
${userQuery}

Below are relevant code snippets retrieved from the user's GitHub repositories.

${contextText}

TASK:
Use ONLY the above code context to answer the user's question.
Explain the user's question in logical and correct manner and dont give generalized answers use the snippet wherever you can and also mention from where you have taken the code from the snippet.
Andd when you will mention the context mention the file name.

Answer in simple, clean language.
`;

  return finalPrompt;
}
