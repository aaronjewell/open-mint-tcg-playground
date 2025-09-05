import http from 'node:http';

export function postJson<T, R>(url: URL, body: T): Promise<R | string> {
    return new Promise((resolve, reject) => {
        const payload = Buffer.from(JSON.stringify(body));
        const req = http.request({
            method: 'POST',
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            headers: { 'content-type': 'application/json', 'content-length': payload.length }
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString('utf8');
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(text)); } catch { resolve(text); }
                } else {
                    reject(new Error(text || `HTTP ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}