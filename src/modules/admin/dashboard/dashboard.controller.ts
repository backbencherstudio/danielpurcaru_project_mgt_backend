import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('employee-role-distribution')
  getEmployeeRoleDistribution() {
    return this.dashboardService.getEmployeeRoleDistribution();
  }

  @Get('attendance-report')
  getAttendanceReport(@Query('start') start: string, @Query('end') end: string) {
    return this.dashboardService.getAttendanceReport({ start, end });
  }
}
