import { Flavor } from "../flavorer/index.js";

export interface OpenAIImageOptions {
    apiKey?: string;
    model?: string; // default gpt-image-1
    size?: string; // e.g., 1024x1024
}

export async function generateImageDataUrl(image: Flavor['image'], options: OpenAIImageOptions = {}): Promise<string> {
    const apiKey = options.apiKey;
    if (!apiKey) throw new Error('OpenAI API key not set');
    const model = options.model || 'gpt-image-1';
    const size = options.size || '1024x1024';
    const responseFormat = 'b64_json';

    let prompt = `${image.description} Style: ${image.style}. Do not include: ${image.negative}.`;

    if (model === 'dall-e-3') {
        prompt = `${image.description}`;
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            prompt,
            size,
            response_format: responseFormat,
        })
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`OpenAI image request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
    }

    const json = await res.json() as any;
    const b64: string | undefined = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI response missing image data');
    return `data:image/png;base64,${b64}`;
}


