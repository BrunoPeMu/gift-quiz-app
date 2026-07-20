type Bucket = {
    lastAt: number;
    count: number;
    windowStart: number;
};

function readBucket(key: string): Bucket | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as Bucket;
    } catch {
        return null;
    }
}

function writeBucket(key: string, value: Bucket) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore storage failures
    }
}

export function allowLocalAction(key: string, minDelayMs: number, maxCount: number, windowMs: number): { ok: boolean; reason?: string } {
    const now = Date.now();
    const bucketKey = `flashtests:${key}`;
    const bucket = readBucket(bucketKey) || { lastAt: 0, count: 0, windowStart: now };

    if (now - bucket.lastAt < minDelayMs) {
        return { ok: false, reason: 'too_fast' };
    }

    if (now - bucket.windowStart >= windowMs) {
        bucket.windowStart = now;
        bucket.count = 0;
    }

    if (bucket.count >= maxCount) {
        return { ok: false, reason: 'rate_limited' };
    }

    bucket.lastAt = now;
    bucket.count += 1;
    writeBucket(bucketKey, bucket);
    return { ok: true };
}
