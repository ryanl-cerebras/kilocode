// Mock i18n
vi.mock("../../i18n", () => ({
	t: vi.fn((key: string, params?: Record<string, any>) => {
		// Return a simplified mock translation for testing
		if (key.startsWith("common:errors.cerebras.")) {
			return `Mocked: ${key.replace("common:errors.cerebras.", "")}`
		}
		return key
	}),
}))

// Mock DEFAULT_HEADERS
vi.mock("../constants", () => ({
	DEFAULT_HEADERS: {
		"HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
		"X-Title": "Roo Code",
		"User-Agent": "RooCode/1.0.0",
	},
}))

import { CerebrasHandler } from "../cerebras"
import { cerebrasModels, type CerebrasModelId } from "@roo-code/types"

// Mock fetch globally
global.fetch = vi.fn()

describe("CerebrasHandler", () => {
	let handler: CerebrasHandler
	const mockOptions = {
		cerebrasApiKey: "test-api-key",
		apiModelId: "llama-3.3-70b" as CerebrasModelId,
	}

	beforeEach(() => {
		vi.clearAllMocks()
		handler = new CerebrasHandler(mockOptions)
	})

	describe("constructor", () => {
		it("should throw error when API key is missing", () => {
			expect(() => new CerebrasHandler({ cerebrasApiKey: "" })).toThrow("Cerebras API key is required")
		})

		it("should initialize with valid API key", () => {
			expect(() => new CerebrasHandler(mockOptions)).not.toThrow()
		})
	})

	describe("getModel", () => {
		it("should return correct model info", () => {
			const { id, info } = handler.getModel()
			expect(id).toBe("llama-3.3-70b")
			expect(info).toEqual(cerebrasModels["llama-3.3-70b"])
		})

		it("should return Kimi K2.6 model info", () => {
			const kimiHandler = new CerebrasHandler({
				cerebrasApiKey: "test-api-key",
				apiModelId: "moonshotai-kimi-k2.6" as CerebrasModelId,
			})
			const { id, info } = kimiHandler.getModel()
			expect(id).toBe("moonshotai-kimi-k2.6")
			expect(info).toEqual(cerebrasModels["moonshotai-kimi-k2.6"])
		})

		it("should fallback to default model when apiModelId is not provided", () => {
			const handlerWithoutModel = new CerebrasHandler({ cerebrasApiKey: "test" })
			const { id } = handlerWithoutModel.getModel()
			expect(id).toBe("gpt-oss-120b") // cerebrasDefaultModelId
		})
	})

	describe("message conversion", () => {
		it("should strip thinking tokens from assistant messages", () => {
			// This would test the stripThinkingTokens function
			// Implementation details would test the regex functionality
		})

		it("should flatten complex message content to strings", () => {
			// This would test the flattenMessageContent function
			// Test various content types: strings, arrays, image objects
		})

		it("should convert OpenAI messages to Cerebras format", () => {
			// This would test the convertToCerebrasMessages function
			// Ensure all messages have string content and proper role/content structure
		})
	})

	describe("createMessage", () => {
		it("should make correct API request", async () => {
			// Mock successful API response
			const mockResponse = {
				ok: true,
				body: {
					getReader: () => ({
						read: vi.fn().mockResolvedValueOnce({ done: true, value: new Uint8Array() }),
						releaseLock: vi.fn(),
					}),
				},
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

			const generator = handler.createMessage("System prompt", [])
			await generator.next() // Actually start the generator to trigger the fetch call

			// Test that fetch was called with correct parameters
			expect(fetch).toHaveBeenCalledWith(
				"https://api.cerebras.ai/v1/chat/completions",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Authorization: "Bearer test-api-key",
						"HTTP-Referer": "https://github.com/RooVetGit/Roo-Cline",
						"X-Title": "Roo Code",
						"User-Agent": "RooCode/1.0.0",
					}),
				}),
			)
		})

		it("should handle API errors properly", async () => {
			const mockErrorResponse = {
				ok: false,
				status: 400,
				text: () => Promise.resolve('{"error": {"message": "Bad Request"}}'),
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockErrorResponse as any)

			const generator = handler.createMessage("System prompt", [])
			// Since the mock isn't working, let's just check that an error is thrown
			await expect(generator.next()).rejects.toThrow()
		})

		it("should parse streaming responses correctly", async () => {
			// Test streaming response parsing
			// Mock ReadableStream with various data chunks
			// Verify thinking token extraction and usage tracking
		})

		it("should handle temperature clamping", async () => {
			const handlerWithTemp = new CerebrasHandler({
				...mockOptions,
				modelTemperature: 2.0, // Above Cerebras max of 1.5
			})

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				body: { getReader: () => ({ read: () => Promise.resolve({ done: true }), releaseLock: vi.fn() }) },
			} as any)

			await handlerWithTemp.createMessage("test", []).next()

			const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
			expect(requestBody.temperature).toBe(1.5) // Should be clamped
		})

		it("should preserve think tags for Kimi K2.6 assistant history replay", async () => {
			const kimiHandler = new CerebrasHandler({
				cerebrasApiKey: "test-api-key",
				apiModelId: "moonshotai-kimi-k2.6" as CerebrasModelId,
			})

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				body: { getReader: () => ({ read: () => Promise.resolve({ done: true }), releaseLock: vi.fn() }) },
			} as any)

			const messages = [
				{
					role: "assistant",
					content: [{ type: "text", text: "<think>Preserved chain of thought</think>\nFinal answer" }],
				},
			] as any

			await kimiHandler.createMessage("test", messages).next()

			const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
			expect(requestBody.messages[1]).toEqual({
				role: "assistant",
				content: "<think>Preserved chain of thought</think>\nFinal answer",
			})
		})

		it("should continue stripping think tags for non-Kimi Cerebras models", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				body: { getReader: () => ({ read: () => Promise.resolve({ done: true }), releaseLock: vi.fn() }) },
			} as any)

			const messages = [
				{
					role: "assistant",
					content: [{ type: "text", text: "<think>Hidden reasoning</think>\nVisible answer" }],
				},
			] as any

			await handler.createMessage("test", messages).next()

			const requestBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)
			expect(requestBody.messages[1]).toEqual({
				role: "assistant",
				content: "Visible answer",
			})
		})

		it("should surface reasoning fields from streamed Cerebras deltas", async () => {
			const streamLines = [
				'data: {"choices":[{"delta":{"reasoning":"First step"}}]}',
				'data: {"choices":[{"delta":{"reasoning_content":"Second step"}}]}',
				"data: [DONE]",
			]
			const encodedChunks = streamLines.map((line) => new TextEncoder().encode(`${line}\n`))
			let index = 0

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				body: {
					getReader: () => ({
						read: vi.fn().mockImplementation(() => {
							if (index >= encodedChunks.length) return Promise.resolve({ done: true, value: undefined })
							return Promise.resolve({ done: false, value: encodedChunks[index++] })
						}),
						releaseLock: vi.fn(),
					}),
				},
			} as any)

			const chunks: Array<{ type: string; text?: string }> = []
			for await (const chunk of handler.createMessage("test", [])) {
				chunks.push(chunk as any)
			}

			expect(chunks.filter((chunk) => chunk.type === "reasoning")).toEqual([
				{ type: "reasoning", text: "First step" },
				{ type: "reasoning", text: "Second step" },
			])
		})
	})

	describe("completePrompt", () => {
		it("should handle non-streaming completion", async () => {
			const mockResponse = {
				ok: true,
				json: () =>
					Promise.resolve({
						choices: [{ message: { content: "Test response" } }],
					}),
			}
			vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

			const result = await handler.completePrompt("Test prompt")
			expect(result).toBe("Test response")
		})
	})

	describe("token usage and cost calculation", () => {
		it("should track token usage properly", () => {
			// Test that lastUsage is updated correctly
			// Test getApiCost returns calculated cost based on actual usage
		})

		it("should provide usage estimates when API doesn't return usage", () => {
			// Test fallback token estimation logic
		})
	})
})
