import 'dotenv/config';
import OpenAI from 'openai';

const apiKey =
  process.env.AI_NVIDIA_API_KEY ||
  process.env.NVIDIA_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_ADMIN_KEY;

const baseURL =
  process.env.AI_NVIDIA_BASE_URL ||
  process.env.NVIDIA_BASE_URL ||
  'https://integrate.api.nvidia.com/v1';

const model =
  process.env.AI_NVIDIA_MODEL ||
  process.env.NVIDIA_MODEL ||
  'z-ai/glm-5.2';

const prompt = process.argv.slice(2).join(' ') || 'Say hello in one short sentence. and give me short programming example how i can implemnt the opensourse model switch and chat without interupt any response';

if (!apiKey) {
  throw new Error(
    'Missing NVIDIA API key. Set AI_NVIDIA_API_KEY or NVIDIA_API_KEY in your .env file.'
  );
}

const openai = new OpenAI({
  apiKey,
  baseURL
});
 
async function main() {
  const completion = await openai.chat.completions.create({
    model,
    messages: [{"role":"user","content": prompt}],
    temperature: 1,
    top_p: 1,
    max_tokens: 16384,
    seed: 42,
    stream: true
  });
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
    
  }
  
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// deepseek-v4-pro
// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: '',
//   baseURL: 'https://integrate.api.nvidia.com/v1',
// })

 
// async function main() {
//   const completion = await openai.chat.completions.create({
//     model: "deepseek-ai/deepseek-v4-pro",
//     messages: [{"role":"user","content":""}],
//     temperature: 1,
//     top_p: 0.95,
//     max_tokens: 16384,
//     chat_template_kwargs: {"thinking":false},
//     stream: false
//   })
   
//     process.stdout.write(completion.choices[0]?.message?.content || '');
  
  
// }

// main();

// import axios from 'axios';


// const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
// const stream = false;


// const headers = {
//   "Authorization": "Bearer" + apiKey,
//   "Accept": stream ? "text/event-stream" : "application/json"
// };

// async function main() {
//   const payload = {"messages":[{"role":"user","content":""}],"model":"moonshotai/kimi-k2.6","max_tokens":16384,"seed":0,"stream":stream,"temperature":1,"top_p":1};

//   const response = await axios.post(invokeUrl, payload, {
//     headers: headers,
//     responseType: stream ? 'stream' : 'json'
//   });

//   if (stream) {
//     response.data.on('data', (chunk) => {
//       console.log(chunk.toString());
//     });
//   } else {
//     console.log(JSON.stringify(response.data));
//   }
// }

// main().catch(error => {
//   if (error.response) {
//     console.error(`HTTP ${error.response.status}`);
//     if (error.response.data?.on) {
//       error.response.data.on('data', (chunk) => console.error(chunk.toString()));
//     } else {
//       console.error(error.response.data);
//     }
//   } else {
//     console.error(error);
//   }
// });