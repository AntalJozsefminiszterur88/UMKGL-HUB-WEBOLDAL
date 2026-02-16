const axios = require('axios');

function toTwoDigits(value) {
    return String(value).padStart(2, '0');
}

function getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = toTwoDigits(now.getMonth() + 1);
    const day = toTwoDigits(now.getDate());
    return `${year}-${month}-${day}`;
}

function extractEventTime(event) {
    const rawValue = event?.eventDateTime || event?.dateTime || event?.startDateTime || event?.time;
    if (!rawValue) {
        return null;
    }

    if (typeof rawValue === 'string') {
        const directMatch = rawValue.match(/\b\d{2}:\d{2}\b/);
        if (directMatch) {
            return directMatch[0];
        }
    }

    const parsedDate = new Date(rawValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return `${toTwoDigits(parsedDate.getHours())}:${toTwoDigits(parsedDate.getMinutes())}`;
}

async function getAllMovies() {
    const logMessages = [];
    const dateString = getCurrentDateString();
    const endpoint = `https://www.cinemacity.hu/hu/data-api-service/v1/quickbook/10102/film-events/in-cinema/1132/at-date/${dateString}`;

    logMessages.push(`Cinema City API lekérdezése indul (${dateString})...`);

    try {
        const response = await axios.get(endpoint, { timeout: 20000 });
        logMessages.push(`Cinema City API válasz megérkezett (HTTP ${response.status}).`);

        const body = response?.data?.body || {};
        const films = Array.isArray(body.films) ? body.films : [];
        const events = Array.isArray(body.events) ? body.events : [];
        const attributes = Array.isArray(body.attributeNames) ? body.attributeNames : [];

        const attributeById = new Map();
        attributes.forEach((attribute) => {
            const attributeId = String(attribute?.id || '').trim();
            const attributeName = String(attribute?.name || '').trim();

            if (!attributeId || !attributeName) {
                return;
            }

            attributeById.set(attributeId, attributeName);
        });

        logMessages.push(`Adatok beolvasva: ${films.length} film, ${events.length} esemény.`);

        const moviesById = new Map();
        films.forEach((film) => {
            const filmId = String(film?.id || '').trim();
            if (!filmId) {
                return;
            }

            const title = (film?.name || film?.title || 'Ismeretlen cím').toString().trim() || 'Ismeretlen cím';
            const posterUrl = String(film?.posterLink || '').trim();
            const attributeIds = Array.isArray(film?.attributeIds) ? film.attributeIds : [];
            const categoryNames = attributeIds
                .map((attributeId) => {
                    const normalizedId = String(attributeId || '').trim();
                    if (!normalizedId) {
                        return '';
                    }

                    return attributeById.get(normalizedId) || normalizedId;
                })
                .filter(Boolean);
            const category = Array.from(new Set(categoryNames)).join(', ');

            moviesById.set(filmId, {
                cinema: 'CC Arena',
                title,
                times: [],
                category,
                posterUrl,
            });
        });

        events.forEach((event) => {
            const filmId = String(event?.filmId || '').trim();
            if (!filmId) {
                return;
            }

            const movie = moviesById.get(filmId);
            if (!movie) {
                return;
            }

            const eventTime = extractEventTime(event);
            if (!eventTime) {
                return;
            }

            if (!movie.times.includes(eventTime)) {
                movie.times.push(eventTime);
            }
        });

        const data = Array.from(moviesById.values())
            .map((movie) => ({
                cinema: movie.cinema,
                title: movie.title,
                times: movie.times.sort((a, b) => a.localeCompare(b)).join(', '),
                category: movie.category,
                posterUrl: movie.posterUrl,
            }))
            .filter((movie) => movie.times.length > 0);

        logMessages.push('Adatok feldolgozása kész.');
        logMessages.push(`Összes feldolgozott film: ${data.length}.`);

        return {
            data,
            logs: logMessages,
        };
    } catch (error) {
        const statusCode = error?.response?.status;
        const errorMessage = error?.message || 'Ismeretlen hiba';
        if (statusCode) {
            logMessages.push(`Hiba történt a Cinema City API hívásakor (HTTP ${statusCode}): ${errorMessage}`);
        } else {
            logMessages.push(`Hiba történt a Cinema City API hívásakor: ${errorMessage}`);
        }

        return {
            data: [],
            logs: logMessages,
        };
    }
}

module.exports = {
    getAllMovies,
};
