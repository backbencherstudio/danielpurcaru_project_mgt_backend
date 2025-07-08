import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DateHelper } from 'src/common/helper/date.helper';

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
}
