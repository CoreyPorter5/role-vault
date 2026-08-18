export type LimitedJsonBodyResult =
    | {ok: true; value: unknown}
    | {ok: false; reason: "invalid_json" | "too_large"};

export async function readLimitedJsonBody(
    request: Request,
    maxBytes: number,
): Promise<LimitedJsonBodyResult> {
    const declaredLength = request.headers.get("content-length");
    if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
        return {ok: false, reason: "too_large"};
    }

    if (!request.body) {
        return {ok: false, reason: "invalid_json"};
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > maxBytes) {
                await reader.cancel();
                return {ok: false, reason: "too_large"};
            }
            chunks.push(value);
        }

        const body = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
            body.set(chunk, offset);
            offset += chunk.byteLength;
        }

        const text = new TextDecoder("utf-8", {fatal: true}).decode(body);
        return {ok: true, value: JSON.parse(text) as unknown};
    } catch {
        return {ok: false, reason: "invalid_json"};
    } finally {
        reader.releaseLock();
    }
}
