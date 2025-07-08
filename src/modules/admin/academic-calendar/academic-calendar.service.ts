import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAcademicCalendarDto, CalendarEventType } from './dto/create-academic-calendar.dto';
import { UpdateAcademicCalendarDto } from './dto/update-academic-calendar.dto';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class AcademicCalendarService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateAcademicCalendarDto) {
    try {
      const data = await this.prisma.academicCalendar.create({
        data: {
          status: dto.status,
          title: dto.title,
          description: dto.description,
          event_type: dto.event_type,
          start_date: dto.start_date ? new Date(dto.start_date) : undefined,
          end_date: dto.end_date ? new Date(dto.end_date) : undefined,
          all_day: dto.all_day,
          location: dto.location,
          organizer: dto.organizer,
          color: dto.color,
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findAll(_query?: any) {
    try {
      const data = await this.prisma.academicCalendar.findMany({
        where: { deleted_at: null },
        orderBy: { start_date: 'asc' },
        select: {
          id: true,
          title: true,
          event_type: true,
          start_date: true,
          end_date: true,
          all_day: true,
          color: true,
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findCalendarMonth({ month, year }: { month: string, year: string }) {
    const timeZone = 'Europe/Lisbon';
    const yearNum = Number(year);
    const monthNum = Number(month);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    // Get all events for the month
    const events = await this.prisma.academicCalendar.findMany({
      where: {
        deleted_at: null,
        start_date: { gte: startDate, lte: endDate }
      },
      select: {
        id: true,
        title: true,
        event_type: true,
        start_date: true,
        end_date: true,
        all_day: true,
        color: true,
      }
    });

    // Map events by date (Portugal time)
    const eventMap: { [date: string]: any[] } = {};
    events.forEach(ev => {
      const zonedDate = toZonedTime(ev.start_date, timeZone);
      const dateStr = zonedDate.toISOString().slice(0, 10);
      if (!eventMap[dateStr]) eventMap[dateStr] = [];
      eventMap[dateStr].push(ev);
    });

    // Build calendar
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      // Always use UTC for date creation, then convert to Portugal time
      const utcDate = new Date(Date.UTC(yearNum, monthNum - 1, d));
      const dateObj = toZonedTime(utcDate, timeZone);
      const dateStr = dateObj.toISOString().slice(0, 10);
      let eventsForDay = eventMap[dateStr] || [];
      // If Sunday in Portugal and no event, add default Off Day
      if (dateObj.getDay() === 0 && eventsForDay.length === 0) {
        eventsForDay = [{ title: 'Off Day', event_type: 'OFF_DAY' }];
      }
      result.push({ date: dateStr, events: eventsForDay });
    }
    return { success: true, data: result };
  }

  async findOne(id: string) {
    try {
      const data = await this.prisma.academicCalendar.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          event_type: true,
          start_date: true,
          end_date: true,
          all_day: true,
          color: true,
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(id: string, dto: UpdateAcademicCalendarDto) {
    try {
      const data = await this.prisma.academicCalendar.update({
        where: { id },
        data: {
          ...dto,
          start_date: dto.start_date ? new Date(dto.start_date) : undefined,
          end_date: dto.end_date ? new Date(dto.end_date) : undefined,
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string) {
    try {
      const data = await this.prisma.academicCalendar.delete({ where: { id } });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
