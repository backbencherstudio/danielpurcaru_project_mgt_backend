import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateHelper } from 'src/common/helper/date.helper';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getSummary() {
        // Total Employees
        const totalEmployee = await this.prisma.user.count({
            where: { type: 'employee', deleted_at: null },
        });

        // Total Hours (sum of all attendance hours)
        const totalHoursAgg = await this.prisma.attendance.aggregate({
            where: { deleted_at: null },
            _sum: { hours: true },
        });
        const totalHours = Number(totalHoursAgg._sum.hours) || 0;

        // Labor Cost (sum of all employees' earning)
        const laborCostAgg = await this.prisma.user.aggregate({
            where: { type: 'employee', deleted_at: null },
            _sum: { earning: true },
        });
        const laborCost = Number(laborCostAgg._sum.earning) || 0;

        // Active Projects
        const activeProject = await this.prisma.project.count({
            where: { status: 1, deleted_at: null },
        });

        return {
            success: true,
            data: {
                totalEmployee,
                totalHours,
                laborCost,
                activeProject,
            },
        };
    }

    async getEmployeeRoleDistribution() {
        // Get total employees
        const total = await this.prisma.user.count({
            where: { type: 'employee', deleted_at: null },
        });

        // Group by employee_role and count
        const roles = await this.prisma.user.groupBy({
            by: ['employee_role'],
            where: { type: 'employee', deleted_at: null },
            _count: { _all: true },
        });

        // Calculate percentage for each role
        const data = roles.map(r => ({
            role: r.employee_role,
            count: r._count._all,
            percent: total ? Math.round((r._count._all / total) * 100) : 0,
        }));

        return {
            success: true,
            data: {
                total,
                roles: data,
            },
        };
    }

    async getAttendanceReport({ start, end }: { start: string, end: string }) {
        // Validate dates
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (!start || !end || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return { success: false, message: 'Invalid or missing start/end date.' };
        }
        // Get all attendance records in the date range
        const records = await this.prisma.attendance.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                deleted_at: null,
            },
            select: {
                date: true,
                attendance_status: true,
            },
        });

        // Group by date and status
        const report: { [date: string]: { [status: string]: number } } = {};
        records.forEach(r => {
            const dateStr = r.date.toISOString().slice(0, 10);
            if (!report[dateStr]) report[dateStr] = {};
            report[dateStr][r.attendance_status] = (report[dateStr][r.attendance_status] || 0) + 1;
        });

        // Format for chart
        const dates = [];
        const present = [];
        const absent = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().slice(0, 10);
            dates.push(dateStr);
            present.push(report[dateStr]?.PRESENT || 0);
            absent.push(report[dateStr]?.ABSENT || 0);
        }

        return {
            success: true,
            data: {
                dates,
                present,
                absent,
            },
        };
    }

    async getEmployeeSummary(user_id: string) {
        // Get employee basic info
        const emp = await this.prisma.user.findUnique({
            where: { id: user_id, deleted_at: null },
            select: {
                id: true,
                name: true,
                employee_role: true,
                hourly_rate: true,
            },
        });
        if (!emp) return { success: false, message: 'Employee not found' };

        // Calculate total hours
        const agg = await this.prisma.attendance.aggregate({
            where: { user_id, deleted_at: null },
            _sum: { hours: true },
        });
        const totalHours = Number(agg._sum.hours) || 0;
        const perHour = Number(emp.hourly_rate) || 0;
        const earning = totalHours * perHour;

        return {
            success: true,
            data: {
                name: emp.name,
                role: emp.employee_role,
                totalHours,
                perHour,
                earning,
            },
        };
    }

    async getEmployeeMonthAttendanceSummary(user_id: string, month: string, year?: string) {
        const yearNum = Number(year) || new Date().getFullYear();
        const monthNum = Number(month);
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const timeZone = 'Europe/Lisbon';

        // Get all OFF_DAY and HOLIDAY dates from academic calendar
        const calendarEvents = await this.prisma.academicCalendar.findMany({
            where: {
                deleted_at: null,
                start_date: {
                    gte: new Date(yearNum, monthNum - 1, 1),
                    lte: new Date(yearNum, monthNum - 1, daysInMonth),
                },
                event_type: { in: ['OFF_DAY', 'HOLIDAY'] },
            },
            select: { start_date: true },
        });
        const skipDates = new Set(
            calendarEvents.map(ev => toZonedTime(ev.start_date, timeZone).toISOString().slice(0, 10))
        );

        // Get all attendance for this user in the month
        const records = await this.prisma.attendance.findMany({
            where: {
                user_id,
                date: {
                    gte: new Date(yearNum, monthNum - 1, 1),
                    lte: new Date(yearNum, monthNum - 1, daysInMonth),
                },
                deleted_at: null,
            },
            select: { date: true, attendance_status: true },
        });
        const recordMap = new Map(records.map(r => [r.date.toISOString().slice(0, 10), r.attendance_status]));

        // Build day list and count
        let complete = 0, unfinished = 0, totalWorkingDays = 0;
        const days = [];
        for (let d = 1; d <= daysInMonth; d++) {
            const utcDate = new Date(Date.UTC(yearNum, monthNum - 1, d));
            const dateObj = toZonedTime(utcDate, timeZone);
            const dateStr = dateObj.toISOString().slice(0, 10);

            // Skip if Sunday or in academic calendar OFF_DAY/HOLIDAY
            if (dateObj.getDay() === 0 || skipDates.has(dateStr)) continue;

            totalWorkingDays++;
            const status = recordMap.get(dateStr) || 'Unfinished';
            if (status === 'PRESENT') complete++;
            else unfinished++;

            days.push({ date: dateStr, status });
        }

        const percentComplete = totalWorkingDays ? Math.round((complete / totalWorkingDays) * 100) : 0;
        const percentUnfinished = 100 - percentComplete;

        return {
            success: true,
            data: {
                complete,
                unfinished,
                percentComplete,
                percentUnfinished,
                totalWorkingDays,
                days, // for calendar view
            }
        };
    }

}
