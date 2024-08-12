import {
   LangChainAdapter,
   Message as VercelChatMessage,
   StreamingTextResponse,
} from "ai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { PromptTemplate } from "@langchain/core/prompts";
import { BufferWindowMemory } from "langchain/memory";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const TEMPLATE = `
You are Sofya, an AI English teacher. Engage in natural English conversations with students, adapting to their level. Keep discussions interesting by introducing new topics, asking thought-provoking questions, and sharing cultural insights. Identify English errors but don't correct them during the conversation. Instead, provide corrections and tips in Indonesian at the end of your response.

After each conversation turn, include:

Notes:
**Corrections:**
- [Error type]: [Explanation in Indonesian]
[Repeat for each error]

**Tips:**
- [Relevant tip in Indonesian]
- [Another relevant tip in Indonesian]

Keep all explanations and tips in Indonesian, except for English terms or examples. Use simple, clear language throughout.

Student Name: {student_name}

## Conversation:
Chat History:
{chat_history}

Student Inquiry: {input}
`;
export async function POST(req: Request) {
   const {
      messages,
      name,
      model,
      id,
      region,
   }: {
      messages: VercelChatMessage[];
      name: string;
      model: string;
      id: string;
      region: string;
   } = await req.json();
   const lastMsg = messages[messages.length - 1];
   const currentMessageContent = lastMsg.content;

   const ollama = new ChatOllama({
      baseUrl: "http://localhost:11434",
      // baseUrl: `${process.env.NEXT_PUBLIC_OLLAMA_URL}/${region}`,
      model: "llama3",
      temperature: 0.7,
      topP: 0.9,
      frequencyPenalty: 0.2,
      presencePenalty: 0.2,
      stop: ["Student:", "Sofya:"],
   });

   // const memory = new BufferWindowMemory({
   //    memoryKey: "chat_history",
   //    inputKey: "input",
   //    outputKey: "output",
   //    returnMessages: true,
   //    humanPrefix: "Student:",
   //    aiPrefix: "Sofya:",
   //    k: 4,
   // });

   const prompt = PromptTemplate.fromTemplate(TEMPLATE);

   const chatHistory = messages
      .slice(1)
      .map(
         (msg) => `${msg.role === "user" ? "Student" : "Sofya"}: ${msg.content}`
      )
      .join("\n");

   const chain = prompt.pipe(ollama);

   const stream = await chain.stream({
      input: currentMessageContent,
      student_name: name,
      chat_history: chatHistory,
   });

   const aiStream = LangChainAdapter.toAIStream(stream);

   return new StreamingTextResponse(aiStream);
}
