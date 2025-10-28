import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const APP_TIMEZONE = 'Europe/Lisbon';

export const toUtc = (value?: string | Date) => {
    if (!value) return undefined;
    const str = typeof value === 'string' ? value : new Date(value).toISOString();
    return dayjs.tz(str, APP_TIMEZONE).toDate();
};

export const toLisbon = (value: string | Date) => {
    return dayjs(value).tz(APP_TIMEZONE).toDate();
};


