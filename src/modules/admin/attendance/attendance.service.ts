import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateAttendanceDto) {
    try {
      // Only check for duplicate if status is PRESENT (or default)
      const status = dto.attendance_status || 'PRESENT';
      if (status === 'PRESENT') {
        const exists = await this.prisma.attendance.findFirst({
          where: {
            user_id: dto.user_id,
            date: new Date(dto.date),
            attendance_status: 'PRESENT',
            deleted_at: null,
          },
        });
        if (exists) {
          return { success: false, message: 'Attendance already marked as PRESENT for this user and date.' };
        }
      }

      // Parse times
      const start_time = dto.start_time ? new Date(dto.start_time) : undefined;
      const end_time = dto.end_time ? new Date(dto.end_time) : undefined;
      const lunch_start = dto.lunch_start ? new Date(dto.lunch_start) : undefined;
      const lunch_end = dto.lunch_end ? new Date(dto.lunch_end) : undefined;

      // Calculate hours if possible
      let hours = dto.hours;
      if (start_time && end_time) {
        hours = (end_time.getTime() - start_time.getTime()) / (1000 * 60 * 60);
        if (lunch_start && lunch_end) {
          hours -= (lunch_end.getTime() - lunch_start.getTime()) / (1000 * 60 * 60);
        }
        hours = Math.max(0, hours);
      }

      const attendance = await this.prisma.attendance.create({
        data: {
          user_id: dto.user_id,
          date: new Date(dto.date),
          start_time,
          lunch_start,
          lunch_end,
          end_time,
          hours,
          attendance_status: dto.attendance_status,
          notes: dto.notes,
          address: dto.address,
        },
      });
      return { success: true, data: attendance };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findGrid({ month, year, search, page = '1', limit = '10' }: { month: string, year: string, search?: string, page?: string, limit?: string }) {
    try {
      if (!month || !year || isNaN(Number(month)) || isNaN(Number(year))) {
        return { success: false, message: 'Invalid or missing month/year parameter.' };
      }
      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * pageSize;
      // 1. Get all users (employees) matching search
      const userWhere: any = { type: 'employee', deleted_at: null };
      if (search) {
        userWhere.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      const total = await this.prisma.user.count({ where: userWhere });
      const users = await this.prisma.user.findMany({
        where: userWhere,
        orderBy: { first_name: 'asc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          name: true,
          email: true,
          avatar: true,
        },
      });
      // 2. Get all attendance for these users in the given month/year
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      const attendanceRecords = await this.prisma.attendance.findMany({
        where: {
          user_id: { in: users.map(u => u.id) },
          date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
        select: {
          id: true,
          user_id: true,
          date: true,
          hours: true,
        },
      });
      // 3. Build grid: for each user, map days of month to { id, hours } or null
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
      const grid = users.map(user => {
        const days: { [key: string]: { id: string, hours: number } | null } = {};
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${month.padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          days[dateStr] = null;
        }
        attendanceRecords.filter(a => a.user_id === user.id).forEach(a => {
          const dateStr = a.date.toISOString().slice(0, 10);
          days[dateStr] = { id: a.id, hours: Number(a.hours) };
        });
        return { user, days };
      });
      return {
        success: true,
        meta: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        data: grid,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async getEmployeeAttendance({ user_id, month, year }: { user_id: string, month: string, year: string }) {
    try {
      if (!user_id || !month || !year || isNaN(Number(month)) || isNaN(Number(year))) {
        return { success: false, message: 'Invalid or missing user_id/month/year parameter.' };
      }
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      // Get all attendance records for this user in the month
      const records = await this.prisma.attendance.findMany({
        where: {
          user_id,
          date: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
        select: {
          id: true,
          date: true,
          start_time: true,
          lunch_start: true,
          lunch_end: true,
          end_time: true,
          hours: true,
        },
      });
      // Map date string (YYYY-MM-DD) to record
      const recordMap: { [date: string]: any } = {};
      records.forEach(r => {
        const dateStr = r.date.toISOString().slice(0, 10);
        recordMap[dateStr] = r;
      });
      // Build result for each day
      const result = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(Number(year), Number(month) - 1, d);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const rec = recordMap[dateStr];
        result.push({
          id: rec?.id || null,
          date: dateObj,
          start_time: rec?.start_time ? rec.start_time.toISOString().slice(11, 16) : '----',
          lunch: rec?.lunch_start && rec?.lunch_end ? `${rec.lunch_start.toISOString().slice(11, 13)}-${rec.lunch_end.toISOString().slice(11, 13)}` : '----',
          end_time: rec?.end_time ? rec.end_time.toISOString().slice(11, 16) : '----',
          total: rec?.hours ? `${Number(rec.hours).toFixed(1)} hrs` : 'No Record',
        });
      }
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findAll(query: any) {
    try {
      const {
        user_id,
        date,
        attendance_status,
        search,
        page = '1',
        limit = '10',
      } = query;
      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;
      const skip = (pageNumber - 1) * pageSize;
      const where: any = { deleted_at: null };
      if (user_id) where.user_id = user_id;
      if (attendance_status) where.attendance_status = attendance_status;
      if (date) where.date = new Date(date);
      if (search) {
        where.OR = [
          { notes: { contains: search, mode: 'insensitive' } },
        ];
      }
      const total = await this.prisma.attendance.count({ where });
      const data = await this.prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              employee_role: true,
            },
          },
        },
      });
      return {
        success: true,
        meta: {
          total,
          page: pageNumber,
          limit: pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        data,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      const data = await this.prisma.attendance.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              employee_role: true,
            },
          },
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(id: string, dto: UpdateAttendanceDto) {
    try {
      const data = await this.prisma.attendance.update({
        where: { id },
        data: {
          ...dto,
          date: dto.date ? new Date(dto.date) : undefined,
          start_time: dto.start_time ? new Date(dto.start_time) : undefined,
          lunch_start: dto.lunch_start ? new Date(dto.lunch_start) : undefined,
          lunch_end: dto.lunch_end ? new Date(dto.lunch_end) : undefined,
          end_time: dto.end_time ? new Date(dto.end_time) : undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              employee_role: true,
            },
          },
        },
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string) {
    try {
      const data = await this.prisma.attendance.delete({ where: { id } });
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
