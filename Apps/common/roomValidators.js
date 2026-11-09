const { AMENITIES } = require('./constant');

const clean = (v) => String(v ?? '').trim().replace(/[ \t]+/g, ' ');

// "4.500.000", "4,500,000" and "4500000" all mean 4500000
const toInt = (v) => {
    const s = String(v ?? '').replace(/[.,\s]/g, '');
    return /^\d+$/.test(s) ? Number(s) : NaN;
};

const toNumber = (v) => {
    const s = String(v ?? '').trim().replace(',', '.');
    return s !== '' && /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

function parseAmenities(raw, errors) {
    if (raw === undefined || raw === '') return [];
    let list = raw;
    if (typeof raw === 'string') {
        try { list = JSON.parse(raw); } catch { errors.amenities = 'Amenities are invalid'; return []; }
    }
    if (!Array.isArray(list) || list.some((x) => typeof x !== 'string' || !AMENITIES.includes(x))) {
        errors.amenities = 'Amenities are invalid';
        return [];
    }
    return [...new Set(list)];
}

// requireAll=false (drafts): only the title is mandatory, but whatever is filled in must be valid.
function validateRoomInput(body = {}, { requireAll }) {
    const errors = {};
    const value = {
        ownerName: clean(body.ownerName),
        title: clean(body.title),
        address: clean(body.address),
        description: String(body.description ?? '').trim(),
    };

    if (!value.title) errors.title = 'Please enter a room name / title';
    else if (value.title.length < 3 || value.title.length > 100) errors.title = 'Title must be 3-100 characters';

    if (requireAll && !value.ownerName) errors.ownerName = 'Please enter the owner’s name';
    else if (value.ownerName.length > 80) errors.ownerName = 'Owner name is too long';

    if (requireAll && !value.address) errors.address = 'Please enter the room’s address';
    else if (value.address && (value.address.length < 5 || value.address.length > 200)) errors.address = 'Address must be 5-200 characters';

    if (value.description.length > 2000) errors.description = 'Description must be under 2000 characters';

    const numeric = [
        ['area', toNumber(body.area), (n) => n >= 5 && n <= 1000, 'Area must be between 5 and 1000 m²', 'Please enter the area'],
        ['price', toInt(body.price), (n) => n >= 100000 && n <= 1e9, 'Rent must be between 100,000 and 1,000,000,000 đ', 'Please enter the monthly rent'],
        ['maxPeople', toInt(body.maxPeople), (n) => n >= 1 && n <= 20, 'Max people must be between 1 and 20', 'Please enter the max number of people'],
    ];
    for (const [field, n, ok, badMsg, missingMsg] of numeric) {
        const empty = String(body[field] ?? '').trim() === '';
        if (empty) { if (requireAll) errors[field] = missingMsg; value[field] = null; }
        else if (Number.isNaN(n) || !ok(n)) { errors[field] = badMsg; value[field] = null; }
        else value[field] = n;
    }

    value.amenities = parseAmenities(body.amenities, errors);
    return { errors, value };
}

// photoOrder = JSON array of existing photo ids and "new" placeholders. null = not sent.
function parseOrder(raw) {
    if (raw === undefined || raw === '') return null;
    try {
        const list = JSON.parse(raw);
        return Array.isArray(list) && list.every((x) => typeof x === 'string') ? list : undefined;
    } catch { return undefined; }
}

module.exports = { validateRoomInput, parseOrder };
