'use server';
/**
 * @fileOverview A flow to validate user input against safety policies.
 *
 * - validateInput - A function that checks if the input is appropriate.
 * - ValidateInputSchema - The input type for the validateInput function.
 * - ValidateOutputSchema - The return type for the validateInput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GenerateResponse} from '@genkit-ai/googleai';

const ValidateInputSchema = z.object({
  text: z.string().describe('The text to validate.'),
});
export type ValidateInput = z.infer<typeof ValidateInputSchema>;

const ValidateOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the input is valid and appropriate.'),
  reason: z.string().optional().describe('The reason why the input is not valid.'),
});
export type ValidateOutput = z.infer<typeof ValidateOutputSchema>;

export async function validateInput(input: ValidateInput): Promise<ValidateOutput> {
  return validateInputFlow(input);
}

const validateInputFlow = ai.defineFlow(
  {
    name: 'validateInputFlow',
    inputSchema: ValidateInputSchema,
    outputSchema: ValidateOutputSchema,
  },
  async ({text}) => {
    // Basic check for empty or very short strings
    if (!text || text.trim().length < 2) {
        return { isValid: false, reason: 'Input is too short.' };
    }

    try {
      const llmResponse = await ai.generate({
        // A simple prompt that includes the text to be validated.
        // This is to trigger the safety filters if the text is inappropriate.
        prompt: `Please repeat the following text exactly as it is: "${text}"`,
        // Request the raw response to inspect safety attributes
        output: {format: 'raw'},
        config: {
            // Use strict safety settings to catch a wide range of inappropriate content.
            safetySettings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
            ],
        }
      });
      
      const rawResponse = llmResponse.output as GenerateResponse;

      // Check if the prompt itself was blocked due to safety policies
      if (rawResponse.promptFeedback?.blockReason === 'SAFETY') {
        return { isValid: false, reason: `This input is not allowed.` };
      }

      // Check if the generated response was blocked
      if (rawResponse.candidates && rawResponse.candidates[0]?.finishReason === 'SAFETY') {
        return { isValid: false, reason: 'This input is not allowed.' };
      }
      
      // If no safety issues were flagged, the input is considered valid.
      return { isValid: true };

    } catch (error) {
      console.error('Input validation error:', error);
      // Treat errors during validation as a failure to validate, for safety.
      // This can happen if the API call fails, which might include being blocked.
      return { isValid: false, reason: 'This input is not allowed.' };
    }
  }
);
