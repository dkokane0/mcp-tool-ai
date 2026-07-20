import "dotenv/config";
import OpenAI from "openai";

const apiKey =
  process.env.AI_NVIDIA_API_KEY ||
  process.env.NVIDIA_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_ADMIN_KEY;

const baseURL =
  process.env.AI_NVIDIA_BASE_URL ||
  process.env.NVIDIA_BASE_URL ||
  "https://integrate.api.nvidia.com/v1";

const model =
  process.env.AI_NVIDIA_MODEL ||
  process.env.NVIDIA_MODEL ||
  "z-ai/glm-5.2";

const prompt =
  process.argv.slice(2).join(" ") ||
  "Say hello in one short sentence and give a short programming example.";
const maxTokens = Number.parseInt(process.env.AI_MAX_TOKENS || "2048", 10);

if (!apiKey) {
  throw new Error("Missing NVIDIA API key. Set AI_NVIDIA_API_KEY or NVIDIA_API_KEY in your .env file.");
}

const openai = new OpenAI({
  apiKey,
  baseURL
});

async function main() {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 1,
    top_p: 1,
    max_tokens: maxTokens,
    seed: 42,
    stream: true
  });

  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
