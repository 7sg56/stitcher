// eslint-disable-next-line @typescript-eslint/no-var-requires
const BadWordsFilter = require("bad-words");

const filter = new BadWordsFilter();

export interface ProfanityResult {
    isProfane: boolean;
    cleaned: string;
    original: string;
}

export function checkProfanity(text: string): ProfanityResult {
    const isProfane = filter.isProfane(text);
    const cleaned = isProfane ? filter.clean(text) : text;
    return { isProfane, cleaned, original: text };
}
