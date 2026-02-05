/**
 * Workers AI Client
 * Provides convenient methods for working with Cloudflare Workers AI
 * 
 * @example
 * import { AIClient, Models } from '@tamyla/clodo-framework/utilities/ai';
 * 
 * const ai = new AIClient(env.AI);
 * const response = await ai.chat([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 */

/**
 * Default models for different tasks
 */
export const Models = {
  // Text Generation
  TEXT_GENERATION: '@cf/meta/llama-3.1-8b-instruct',
  TEXT_GENERATION_FAST: '@cf/meta/llama-3.1-8b-instruct-fast',
  TEXT_GENERATION_LARGE: '@cf/meta/llama-3.1-70b-instruct',
  
  // Code Generation
  CODE_GENERATION: '@hf/thebloke/deepseek-coder-6.7b-instruct-awq',
  
  // Chat
  CHAT: '@cf/meta/llama-3.1-8b-instruct',
  
  // Embeddings
  EMBEDDINGS: '@cf/baai/bge-base-en-v1.5',
  EMBEDDINGS_LARGE: '@cf/baai/bge-large-en-v1.5',
  
  // Image Generation
  IMAGE_GENERATION: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
  IMAGE_GENERATION_FAST: '@cf/lykon/dreamshaper-8-lcm',
  
  // Image Classification
  IMAGE_CLASSIFICATION: '@cf/microsoft/resnet-50',
  
  // Speech to Text
  SPEECH_TO_TEXT: '@cf/openai/whisper',
  SPEECH_TO_TEXT_TINY: '@cf/openai/whisper-tiny-en',
  
  // Translation
  TRANSLATION: '@cf/meta/m2m100-1.2b',
  
  // Summarization
  SUMMARIZATION: '@cf/facebook/bart-large-cnn',
  
  // Sentiment Analysis
  SENTIMENT: '@cf/huggingface/distilbert-sst-2-int8',
  
  // Object Detection
  OBJECT_DETECTION: '@cf/facebook/detr-resnet-50'
};

/**
 * AI Client for Workers AI
 */
export class AIClient {
  /**
   * @param {Object} ai - AI binding from env
   * @param {Object} options - Client options
   */
  constructor(ai, options = {}) {
    if (!ai) {
      throw new Error('AI binding is required');
    }
    this.ai = ai;
    this.options = {
      defaultModel: Models.CHAT,
      maxTokens: 1024,
      temperature: 0.7,
      ...options
    };
  }

  /**
   * Run a model directly
   */
  async run(model, inputs) {
    return this.ai.run(model, inputs);
  }

  /**
   * Generate text from a prompt
   */
  async generateText(prompt, options = {}) {
    const model = options.model || this.options.defaultModel;
    
    const response = await this.ai.run(model, {
      prompt,
      max_tokens: options.maxTokens || this.options.maxTokens,
      temperature: options.temperature || this.options.temperature,
      ...(options.stream && { stream: true })
    });

    if (options.stream) {
      return response;
    }

    return response.response || response;
  }

  /**
   * Chat completion with message history
   */
  async chat(messages, options = {}) {
    const model = options.model || Models.CHAT;
    
    const response = await this.ai.run(model, {
      messages,
      max_tokens: options.maxTokens || this.options.maxTokens,
      temperature: options.temperature || this.options.temperature,
      ...(options.stream && { stream: true })
    });

    if (options.stream) {
      return response;
    }

    return response.response || response;
  }

  /**
   * Generate embeddings for text
   */
  async embed(text, options = {}) {
    const model = options.model || Models.EMBEDDINGS;
    const texts = Array.isArray(text) ? text : [text];
    
    const response = await this.ai.run(model, { text: texts });
    
    return response.data || response;
  }

  /**
   * Generate an image from a prompt
   */
  async generateImage(prompt, options = {}) {
    const model = options.model || Models.IMAGE_GENERATION;
    
    const response = await this.ai.run(model, {
      prompt,
      negative_prompt: options.negativePrompt,
      height: options.height || 1024,
      width: options.width || 1024,
      num_steps: options.steps || 20,
      guidance: options.guidance || 7.5
    });

    return response;
  }

  /**
   * Classify an image
   */
  async classifyImage(image, options = {}) {
    const model = options.model || Models.IMAGE_CLASSIFICATION;
    
    const response = await this.ai.run(model, {
      image: Array.isArray(image) ? image : [...new Uint8Array(image)]
    });

    return response;
  }

  /**
   * Detect objects in an image
   */
  async detectObjects(image, options = {}) {
    const model = options.model || Models.OBJECT_DETECTION;
    
    const response = await this.ai.run(model, {
      image: Array.isArray(image) ? image : [...new Uint8Array(image)]
    });

    return response;
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(audio, options = {}) {
    const model = options.model || Models.SPEECH_TO_TEXT;
    
    const response = await this.ai.run(model, {
      audio: Array.isArray(audio) ? audio : [...new Uint8Array(audio)]
    });

    return response;
  }

  /**
   * Translate text
   */
  async translate(text, sourceLang, targetLang, options = {}) {
    const model = options.model || Models.TRANSLATION;
    
    const response = await this.ai.run(model, {
      text,
      source_lang: sourceLang,
      target_lang: targetLang
    });

    return response.translated_text || response;
  }

  /**
   * Summarize text
   */
  async summarize(text, options = {}) {
    const model = options.model || Models.SUMMARIZATION;
    
    const response = await this.ai.run(model, {
      input_text: text,
      max_length: options.maxLength || 150
    });

    return response.summary || response;
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text, options = {}) {
    const model = options.model || Models.SENTIMENT;
    
    const response = await this.ai.run(model, { text });
    
    return response;
  }

  /**
   * Calculate similarity between texts using embeddings
   */
  async similarity(text1, text2) {
    const embeddings = await this.embed([text1, text2]);
    return this.cosineSimilarity(embeddings[0], embeddings[1]);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Create an SSE stream from AI stream response
 */
export function createSSEStream(stream) {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = typeof value === 'string' ? value : new TextDecoder().decode(value);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

/**
 * Create a streaming response for AI output
 */
export function streamResponse(stream) {
  return new Response(createSSEStream(stream), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

export default AIClient;
