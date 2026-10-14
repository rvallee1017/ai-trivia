import express from "express";
import { MODEL, ai } from "../gemini.js";

const router = express.Router();

const PROMPT = `You are a sharp, witty trivia host writing questions for a fast-paced game played by curious adults - fun, not academic.
Given a topic, write ONE multiple-choice question about it: four options, exactly one correct answer.
Keep the question to a single sentence. Make the three wrong options plausible, not silly.
Avoid trivia so obscure only a specialist would know it.
Reply as JSON with this exact shape, and nothing else:
{ "question": string, "options": [string, string, string, string], "answer": string }
The "answer" must be exactly one of the four options. No preamble, no markdown.

Example - 
Topic: Space
{ "question": "What is the largest planet in our solar system?", "options": ["Earth", "Mars", "Jupiter", "Saturn"], "answer": "Jupiter" }
`;

router.post("/", async (req, res) => {
  const { image, mimeType } = req.body;

  const interaction = await ai.interactions.create({
    model: MODEL,
    input: [
      { type: "image", data: image, mime_type: mimeType },
      { type: "text", text: "Write a trivia question about this image." },
    ],
    system_instruction: PROMPT,
    generation_config: { temperature: 0.9 },
    response_format: { type: "text", mime_type: "application/json" },
  });

  console.log(interaction.output_text);

  const quiz = JSON.parse(interaction.output_text);
  res.json(quiz);
});

export default router;
