import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post()
  @Roles(Role.EMPLOYEE)
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Post('check-absence')
  async checkAbsence(@Body('date') date?: string, @Query('date') dateQuery?: string) {
    const dateToCheck = date || dateQuery || new Date().toISOString().slice(0, 10);
    return this.attendanceService.checkAndFillDailyAbsence(dateToCheck);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: any) {
    return this.attendanceService.findAll(query);
  }

  @Get('grid')
  @Roles(Role.ADMIN)
  async findGrid(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const monthNum = Number(month);
    if (!month || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { success: false, message: 'Invalid month. Must be between 1 and 12.' };
    }
    const yearToUse = year || new Date().getFullYear().toString();
    return this.attendanceService.findGrid({ month, year: yearToUse, search, page, limit });
  }

  @Get('employee/:user_id')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  getEmployeeAttendance(
    @Param('user_id') user_id: string,
    @Query('month') month: string,
    @Query('year') year?: string,
  ) {
    const yearToUse = year || new Date().getFullYear().toString();
    return this.attendanceService.getEmployeeAttendance({ user_id, month, year: yearToUse });
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  update(@Param('id') id: string, @Body() updateAttendanceDto: UpdateAttendanceDto) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
