import fs from "fs-extra";
import { z } from "zod";
/**
 * Register GPT Image generation tools on the given MCP server.
 * Uses the direct Images API for synchronous generation with model selection.
 *
 * @see https://platform.openai.com/docs/guides/image-generation - GPT Image documentation
 * @see https://platform.openai.com/docs/api-reference/images - Images API reference
 */
export function registerImageTools(server, client, outputDirectory) {
    server.registerTool("gpt_image_generate", {
        description: "Generate an image using OpenAI's GPT Image models. Supports gpt-image-1.5 (best quality), gpt-image-1, and gpt-image-1-mini. Returns the generated image file path directly.",
        inputSchema: {
            prompt: z
                .string()
                .max(32000)
                .describe("Text description of the image you want to generate. Be as detailed as possible for best results. Maximum 32,000 characters."),
            model: z
                .enum(["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"])
                .optional()
                .default("gpt-image-1.5")
                .describe("Model to use: gpt-image-1.5 (best quality, recommended), gpt-image-1 (good quality), or gpt-image-1-mini (faster, lower cost)"),
            size: z
                .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
                .optional()
                .default("auto")
                .describe("Image size: 1024x1024 (square, faster), 1536x1024 (landscape), 1024x1536 (portrait), or auto (model decides)"),
            quality: z
                .enum(["low", "medium", "high"])
                .optional()
                .default("high")
                .describe("Image quality: low (fastest), medium (good for iteration), high (best quality, default). Production work should use high."),
            background: z
                .enum(["transparent", "opaque", "auto"])
                .optional()
                .default("auto")
                .describe("Background type: transparent (PNG/WebP only, works best with medium/high quality), opaque, or auto (model decides)"),
            output_format: z
                .enum(["png", "jpeg", "webp"])
                .optional()
                .default("png")
                .describe("Output format: png (default, supports transparency), jpeg (faster), or webp (good compression)"),
            output_compression: z
                .number()
                .min(0)
                .max(100)
                .optional()
                .describe("Compression level for jpeg/webp (0-100%). Higher = less compression, larger file. Only applicable for jpeg and webp formats."),
            filename: z
                .string()
                .optional()
                .describe("Custom filename for the image (without extension). If not provided, a timestamped name will be generated."),
        },
    }, async ({ prompt, model, size, quality, background, output_format, output_compression, filename, }) => {
        try {
            console.log(`[ImageTools] Starting image generation with ${model}: ${prompt.substring(0, 50)}... (${size}, ${quality}, ${output_format})`);
            // Validate background transparency is only for PNG/WebP
            if (background === "transparent" && output_format === "jpeg") {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: "Transparent backgrounds are only supported with png or webp formats, not jpeg",
                            }),
                        },
                    ],
                };
            }
            // Build request parameters
            const params = {
                model: model,
                prompt,
                n: 1,
            };
            // Add optional parameters (only if not auto)
            if (size !== "auto") {
                params.size = size;
            }
            if (quality) {
                params.quality = quality;
            }
            if (background !== "auto") {
                params.background = background;
            }
            if (output_format) {
                params.output_format = output_format;
            }
            if (output_compression !== undefined) {
                params.output_compression = output_compression;
            }
            // Generate image using direct Images API
            const response = await client.images.generate(params);
            const imageData = response.data?.[0];
            if (!imageData || !("b64_json" in imageData) || !imageData.b64_json) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: "No image data returned from API",
                            }),
                        },
                    ],
                };
            }
            // Convert base64 to buffer
            const buffer = Buffer.from(imageData.b64_json, "base64");
            // Ensure output directory exists
            await fs.ensureDir(outputDirectory);
            // Determine file extension
            const ext = (output_format || "png").toLowerCase();
            // Determine final filename
            const timestamp = Date.now();
            const finalFilename = filename
                ? `${filename}.${ext}`
                : `generated-${timestamp}.${ext}`;
            const filePath = `${outputDirectory}/${finalFilename}`;
            // Write to disk
            await fs.writeFile(filePath, buffer);
            console.log(`[ImageTools] Image saved to: ${filePath}`);
            if (imageData.revised_prompt) {
                console.log(`[ImageTools] Revised prompt: ${imageData.revised_prompt}`);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            filePath,
                            filename: finalFilename,
                            size: buffer.length,
                            model,
                            revisedPrompt: imageData.revised_prompt || undefined,
                            message: `Image generated and saved to ${filePath}`,
                        }),
                    },
                ],
            };
        }
        catch (error) {
            console.error("[ImageTools] Error generating image:", error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error),
                        }),
                    },
                ],
            };
        }
    });
}
//# sourceMappingURL=index.js.map