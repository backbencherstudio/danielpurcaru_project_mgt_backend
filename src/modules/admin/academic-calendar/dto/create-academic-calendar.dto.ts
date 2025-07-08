import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsInt } from 'class-validator';

export enum CalendarEventType {
    HOLIDAY = 'HOLIDAY',
    MEETING = 'MEETING',
    DEADLINE = 'DEADLINE',
    TRAINING = 'TRAINING',
    EVENT = 'EVENT',
    OFF_DAY = 'OFF_DAY'
}

export class CreateAcademicCalendarDto {
    @IsOptional()
    @IsInt()
    status?: number;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(CalendarEventType)
    event_type?: CalendarEventType;

    @IsOptional()
    @IsDateString()
    start_date?: string;

    @IsOptional()
    @IsDateString()
    end_date?: string;

    @IsOptional()
    @IsBoolean()
    all_day?: boolean;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    organizer?: string;

    @IsOptional()
    @IsString()
    color?: string;
}
