import express from "express";
import { MODEL, ai } from "../gemini.js";

const router = express.Router();

const PROMPT = `You are a sharp, witty trivia host writing questions for a fast-paced game played by curious adults - fun, not academic.
Given a topic, write ONE multiple-choice question about it: four options, exactly one correct answer, and a one-line fun fact about the correct answer.
Keep the question to a single sentence. Make the three wrong options plausible, not silly.
Avoid trivia so obscure only a specialist would know it.
Reply as JSON with this exact shape, and nothing else:
{ "question": string, "options": [string, string, string, string], "answer": string, "funFact": string }
The "answer" must be exactly one of the four options. No preamble, no markdown.

Example - 
Topic: Space
{ "question": "What is the largest planet in our solar system?", "options": ["Earth", "Mars", "Jupiter", "Saturn"], "answer": "Jupiter", "funFact": "Jupiter is so large that more than 1,300 Earths could fit inside it." }
`;

router.post('/', async (req, res) => {
  const topic = req.body?.topic;
  if (typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Enter a topic.' });
  }

  const schema = {
    type: 'object',
    properties: {
      question: { type: 'string' },
      options: {
        type: 'array',
        items: { type: 'string' },
        minItems: 4,
        maxItems: 4,
      },
      answer: { type: 'string' },
    },
    required: ['question', 'options', 'answer'],
  };

  let failure;

  for (const model of [...new Set(['gemini-3.5-flash-lite', MODEL])]) {
    try {
      const result = await ai.interactions.create(
        {
          model,
          input: `Topic: ${topic}`,
          system_instruction: PROMPT,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema,
          },
        },
        { timeout: 20000, maxRetries: 2 }
      );

      const quiz = JSON.parse(result.output_text);

      if (
        typeof quiz.question !== 'string' ||
        !quiz.question.trim() ||
        !Array.isArray(quiz.options) ||
        quiz.options.length !== 4 ||
        !quiz.options.every((option) => typeof option === 'string' && option.trim()) ||
        !quiz.options.includes(quiz.answer)
      ) {
        throw new Error('Gemini returned an invalid question.');
      }

      return res.json(quiz);
    } catch (error) {
      console.error(error);
      failure = error;
      const status = Number(error.status ?? error.statusCode);
      if (status && ![408, 429, 500, 502, 503, 504].includes(status)) break;
    }
  }

  return res.status(502).json({
    error: failure?.message || 'Question generation failed.',
  });
});

export default router;
