import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

import { checkApiLimit, increaseApiLimit } from "@/lib/api-limit";

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const instructionMessage: ChatCompletionRequestMessage = {
    role: "system",
    content: "You are a code generator. You must answer only in markdown code snippets. Use code comments for explanation."
}

export async function POST(
    req: Request
) {
    try {
        const { userId } = auth();
        const body = await req.json();
        const { messages } = body;

        if(!userId){
            return new NextResponse("Unauthorised", { status: 401 });
        }

        if(!configuration.apiKey){
            return new NextResponse("OpenAI API key not configured", { status: 500 })
        }

        if(!messages){
            return new NextResponse("Messages are required", { status: 400 });
        }

        const freeTrial = await checkApiLimit();

        if(!freeTrial) {
            return new NextResponse("Free Trial has expired.", { status:403 });
        }

        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [instructionMessage, ...messages]
        });

        await increaseApiLimit();

        return NextResponse.json(response.data.choices[0].message);
    } catch (error) {
        console.log("[CODE_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}