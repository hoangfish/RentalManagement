// Node's fetch() often just says "fetch failed"; the real reason (DNS, timeout, refused...) is in err.cause.
const reason = (err) => err?.cause?.code || err?.cause?.message || err?.message || String(err);

module.exports = { reason };
